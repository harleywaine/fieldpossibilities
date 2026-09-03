/**
 * Polite HTTP layer: identified user-agent, bounded concurrency, inter-request
 * delay, timeout, and retry with exponential backoff + jitter (brief §6).
 */
import { CONFIG } from './config.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('http');

export class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    // The slot is transferred by release(), which does not decrement — this
    // avoids a window where a new caller can claim the slot ahead of a waiter.
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next(); // hand the slot straight to the waiter; `active` is unchanged
      return;
    }
    this.active--;
  }
}

const gate = new Semaphore(CONFIG.concurrency);
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialises the minimum gap between request starts across all workers. */
async function pace(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + CONFIG.delayMs - now;
  lastRequestAt = Math.max(now, lastRequestAt + CONFIG.delayMs);
  if (wait > 0) await sleep(wait);
}

export interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
  url: string;
  attempts: number;
  error?: string;
}

class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Guarantees an attempt settles. AbortController alone proved insufficient: a
 * stalled response body can leave `fetch`/`.text()` pending indefinitely, which
 * hangs the worker and — because the worker never releases its slot — eventually
 * the whole crawl. Racing against a timer makes progress unconditional.
 */
function withDeadline<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    }),
  ]).finally(() => clearTimeout(timer!)) as Promise<T>;
}

/** 429/5xx and network faults are retryable; 4xx (except 429) are not. */
function retryable(status: number): boolean {
  return status === 429 || status === 408 || status >= 500;
}

export async function politeFetch(
  url: string,
  init: RequestInit = {},
): Promise<FetchResult> {
  await gate.acquire();
  try {
    let attempt = 0;
    let lastErr = '';
    let lastStatus = 0;

    while (attempt < CONFIG.maxAttempts) {
      attempt++;
      await pace();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
      try {
        // The deadline covers the response AND the body read, not just headers.
        const { res, body } = await withDeadline(
          (async () => {
            const r = await fetch(url, {
              ...init,
              signal: ctrl.signal,
              headers: {
                'User-Agent': CONFIG.userAgent,
                Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-GB,en;q=0.9',
                ...(init.headers ?? {}),
              },
            });
            return { res: r, body: r.ok ? await r.text() : '' };
          })(),
          CONFIG.timeoutMs,
        );
        lastStatus = res.status;

        if (res.ok) {
          return { ok: true, status: res.status, body, url: res.url, attempts: attempt };
        }

        if (!retryable(res.status)) {
          return {
            ok: false,
            status: res.status,
            body: '',
            url,
            attempts: attempt,
            error: `HTTP ${res.status}`,
          };
        }

        // Honour Retry-After when the server supplies it.
        const ra = Number(res.headers.get('retry-after'));
        const backoff = Number.isFinite(ra) && ra > 0
          ? ra * 1000
          : Math.min(CONFIG.backoffBaseMs * 2 ** (attempt - 1), CONFIG.backoffMaxMs);
        lastErr = `HTTP ${res.status}`;
        log.debug(`retry ${attempt}/${CONFIG.maxAttempts} in ${backoff}ms — ${url}`);
        await sleep(backoff + Math.random() * 250);
      } catch (e) {
        ctrl.abort(); // release the underlying socket when the deadline won the race
        lastErr = e instanceof Error ? e.message : String(e);
        const backoff = Math.min(
          CONFIG.backoffBaseMs * 2 ** (attempt - 1),
          CONFIG.backoffMaxMs,
        );
        log.debug(`error ${attempt}/${CONFIG.maxAttempts} (${lastErr}) in ${backoff}ms — ${url}`);
        await sleep(backoff + Math.random() * 250);
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      ok: false,
      status: lastStatus,
      body: '',
      url,
      attempts: attempt,
      error: lastErr || 'exhausted retries',
    };
  } finally {
    gate.release();
  }
}

/**
 * Binary variant for images. Shares the politeness gate, pacing and deadline so
 * asset downloads are throttled exactly like page requests.
 */
export async function politeFetchBinary(
  url: string,
): Promise<{ ok: boolean; status: number; bytes: Buffer | null; error?: string }> {
  await gate.acquire();
  try {
    let attempt = 0;
    let lastErr = '';
    let lastStatus = 0;

    while (attempt < CONFIG.maxAttempts) {
      attempt++;
      await pace();
      const ctrl = new AbortController();
      try {
        const { res, buf } = await withDeadline(
          (async () => {
            const r = await fetch(url, {
              signal: ctrl.signal,
              headers: { 'User-Agent': CONFIG.userAgent, Accept: 'image/*,*/*;q=0.8' },
            });
            return { res: r, buf: r.ok ? Buffer.from(await r.arrayBuffer()) : null };
          })(),
          CONFIG.timeoutMs,
        );
        lastStatus = res.status;
        if (res.ok && buf) return { ok: true, status: res.status, bytes: buf };
        if (!retryable(res.status)) {
          return { ok: false, status: res.status, bytes: null, error: `HTTP ${res.status}` };
        }
        lastErr = `HTTP ${res.status}`;
      } catch (e) {
        ctrl.abort();
        lastErr = e instanceof Error ? e.message : String(e);
      }
      await sleep(
        Math.min(CONFIG.backoffBaseMs * 2 ** (attempt - 1), CONFIG.backoffMaxMs) + Math.random() * 250,
      );
    }
    return { ok: false, status: lastStatus, bytes: null, error: lastErr || 'exhausted retries' };
  } finally {
    gate.release();
  }
}

export async function fetchJson<T>(url: string): Promise<{ data: T | null; res: FetchResult }> {
  const res = await politeFetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { data: null, res };
  try {
    return { data: JSON.parse(res.body) as T, res };
  } catch (e) {
    return { data: null, res: { ...res, ok: false, error: `bad JSON: ${(e as Error).message}` } };
  }
}

/** Runs tasks through the shared politeness gate with a bounded worker pool. */
export async function mapPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let done = 0;

  const runners = Array.from({ length: Math.min(CONFIG.concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      onProgress?.(++done, items.length);
    }
  });

  await Promise.all(runners);
  return results;
}
