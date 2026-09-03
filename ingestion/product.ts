/**
 * Individual product page acquisition.
 *
 * The page is fetched for one reason the APIs cannot serve: Field's template
 * renders a specification table containing Lead Time (days), Weight, Dimensions
 * and Stock location. Raw HTML is retained gzipped as source evidence (§9).
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { CONFIG } from './config.ts';
import { politeFetch } from './http.ts';
import { sha256 } from './normalise.ts';

/** Filesystem-safe name derived from the product slug. */
export function rawPath(slug: string): string {
  const safe = slug.replace(/[^a-z0-9._-]/gi, '_').slice(0, 120);
  return join(CONFIG.paths.rawProducts, `${safe}.html.gz`);
}

export function readRawHtml(slug: string): string | null {
  const p = rawPath(slug);
  if (!existsSync(p)) return null;
  try {
    return gunzipSync(readFileSync(p)).toString('utf8');
  } catch {
    return null;
  }
}

export interface ProductPageResult {
  url: string;
  slug: string;
  ok: boolean;
  status: number;
  attempts: number;
  html: string | null;
  htmlHash: string | null;
  error?: string;
  fromCache: boolean;
}

export async function fetchProductPage(
  url: string,
  slug: string,
  opts: { useCache?: boolean } = {},
): Promise<ProductPageResult> {
  if (opts.useCache !== false) {
    const cached = readRawHtml(slug);
    if (cached) {
      return {
        url, slug, ok: true, status: 200, attempts: 0,
        html: cached, htmlHash: sha256(cached), fromCache: true,
      };
    }
  }

  const res = await politeFetch(url);
  if (!res.ok) {
    return {
      url, slug, ok: false, status: res.status, attempts: res.attempts,
      html: null, htmlHash: null, error: res.error, fromCache: false,
    };
  }

  if (CONFIG.keepRawHtml) {
    try {
      writeFileSync(rawPath(slug), gzipSync(Buffer.from(res.body, 'utf8'), { level: 6 }));
    } catch {
      /* disk issues must not abort a crawl */
    }
  }

  return {
    url, slug, ok: true, status: res.status, attempts: res.attempts,
    html: res.body, htmlHash: sha256(res.body), fromCache: false,
  };
}
