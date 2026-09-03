/**
 * Crawl orchestrator (brief §34).
 *
 * Pipeline: discover → crawl catalogue → extract products → normalise →
 * deduplicate → validate → store snapshot → rebuild index → report.
 *
 * Every product URL is checkpointed in `crawl_records`, so an interrupted run
 * resumes from what remains rather than starting again (brief §7).
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import { CONFIG } from './config.ts';
import { makeLogger } from './logger.ts';
import { mapPool } from './http.ts';
import {
  fetchRobots, discoverSitemapUrls, discoverTaxonomies, classifyUrl, isAllowed,
  type TaxonomyTerm, type RobotsRules,
} from './discovery.ts';
import {
  fetchWpProducts, fetchStoreProducts, persistRaw, readRaw,
  type WpProduct, type StoreProduct,
} from './catalogue.ts';
import { fetchProductPage, readRawHtml } from './product.ts';
import { normaliseProduct, type NormalisedProduct } from './normalise.ts';
import { deduplicate } from './deduplicate.ts';
import {
  openDb, createSchema, ensureDirs, registerDiscovered, upsertCrawlRecord,
} from './storage.ts';

const log = makeLogger('crawler');

export interface CrawlOptions {
  incremental?: boolean;
  phase?: 'all' | 'api' | 'html';
  limit?: number;
  /** Crawl these URL substrings first (used to front-load demo-relevant records). */
  priority?: string[];
  /** Re-request the REST payloads instead of reusing a fresh cached copy. */
  refreshApi?: boolean;
}

export interface CrawlStats {
  runId: string;
  mode: string;
  startedAt: string;
  completedAt: string | null;
  sitemapUrls: number;
  productUrlsDiscovered: number;
  taxonomyUrls: number;
  cataloguePages: number;
  apiRecords: number;
  pagesCrawled: number;
  pagesFromCache: number;
  pagesFailed: number;
  productsParsed: number;
  duplicatesRemoved: number;
  changed: number;
  unchanged: number;
  new: number;
  failedUrls: Array<{ url: string; status: number; error: string }>;
}

function loadState(): Record<string, unknown> {
  if (!existsSync(CONFIG.paths.crawlState)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG.paths.crawlState, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state: Record<string, unknown>): void {
  writeFileSync(CONFIG.paths.crawlState, JSON.stringify(state, null, 2));
}

export interface CrawlResult {
  stats: CrawlStats;
  db: DatabaseSync;
  products: NormalisedProduct[];
  terms: TaxonomyTerm[];
  alternates: Map<string, Set<string>>;
}

export async function runCrawl(opts: CrawlOptions = {}): Promise<CrawlResult> {
  ensureDirs();
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const phase = opts.phase ?? 'all';

  const stats: CrawlStats = {
    runId, mode: opts.incremental ? 'incremental' : 'full',
    startedAt: new Date().toISOString(), completedAt: null,
    sitemapUrls: 0, productUrlsDiscovered: 0, taxonomyUrls: 0, cataloguePages: 0,
    apiRecords: 0, pagesCrawled: 0, pagesFromCache: 0, pagesFailed: 0,
    productsParsed: 0, duplicatesRemoved: 0, changed: 0, unchanged: 0, new: 0,
    failedUrls: [],
  };

  const db = openDb();
  createSchema(db);

  // ---------------------------------------------------------------- discovery
  log.info('── discovery ──');
  const robots: RobotsRules = await fetchRobots();
  const sitemap = await discoverSitemapUrls(robots.sitemaps);
  stats.sitemapUrls = sitemap.length;

  const classified = sitemap.map((e) => ({ ...e, kind: classifyUrl(e.loc) }));
  const productEntries = classified.filter((e) => e.kind === 'product' && isAllowed(e.loc, robots));
  const taxonomyEntries = classified.filter((e) => e.kind === 'taxonomy');
  const catalogueEntries = classified.filter((e) => e.kind === 'catalogue');

  stats.productUrlsDiscovered = productEntries.length;
  stats.taxonomyUrls = taxonomyEntries.length;
  stats.cataloguePages = catalogueEntries.length;

  registerDiscovered(db, [
    ...productEntries.map((e) => ({ url: e.loc, kind: 'product', lastmod: e.lastmod })),
    ...taxonomyEntries.map((e) => ({ url: e.loc, kind: 'taxonomy', lastmod: e.lastmod })),
    ...catalogueEntries.map((e) => ({ url: e.loc, kind: 'catalogue', lastmod: e.lastmod })),
  ]);
  log.info(
    `discovered ${productEntries.length} product urls, ${taxonomyEntries.length} taxonomy pages, ` +
    `${catalogueEntries.length} catalogue pages (${sitemap.length} sitemap urls total)`,
  );

  // ------------------------------------------------------------------- API
  log.info('── catalogue records ──');
  const fresh = opts.refreshApi || opts.incremental ? 0 : 24;
  const terms: TaxonomyTerm[] =
    (fresh ? readRaw<TaxonomyTerm[]>('taxonomy-terms.json', fresh) : null) ?? await discoverTaxonomies();
  const wp: WpProduct[] =
    (fresh ? readRaw<WpProduct[]>('wp-products.json', fresh) : null) ?? await fetchWpProducts();
  const store: StoreProduct[] =
    (fresh ? readRaw<StoreProduct[]>('store-products.json', fresh) : null) ?? await fetchStoreProducts();
  stats.apiRecords = wp.length;

  persistRaw('taxonomy-terms.json', terms);
  persistRaw('wp-products.json', wp);
  persistRaw('store-products.json', store);

  const termIndex = new Map(terms.map((t) => [`${t.taxonomy}:${t.id}`, t]));
  const storeIndex = new Map(store.map((s) => [s.id, s]));

  // ------------------------------------------------------- product page crawl
  let htmlByWpId = new Map<number, string>();

  if (phase !== 'api') {
    log.info('── product pages ──');

    const prior = new Map<string, { hash: string | null; status: string }>(
      db.prepare(`SELECT url, content_hash, status FROM crawl_records WHERE kind='product'`)
        .all()
        .map((r: any) => [r.url, { hash: r.content_hash, status: r.status }]),
    );

    let targets = wp.map((p) => ({ url: p.link, slug: p.slug, wp_id: p.id }));

    // Resume: skip anything already completed unless this is an incremental refresh.
    if (!opts.incremental) {
      targets = targets.filter((t) => prior.get(t.url)?.status !== 'complete' || !readRawHtml(t.slug));
    }

    if (opts.priority?.length) {
      const isPriority = (t: { url: string; slug: string }) =>
        opts.priority!.some((p) => t.url.toLowerCase().includes(p.toLowerCase()) || t.slug.toLowerCase().includes(p.toLowerCase()));
      targets = [...targets.filter(isPriority), ...targets.filter((t) => !isPriority(t))];
    }

    const alreadyComplete = wp.length - targets.length;
    if (opts.limit) targets = targets.slice(0, opts.limit);

    log.info(
      `${targets.length} product pages to crawl` +
      (alreadyComplete > 0 ? ` (${alreadyComplete} already complete)` : '') +
      (opts.limit ? ` [limited to ${opts.limit}]` : ''),
    );

    let processed = 0;
    await mapPool(targets, async (t) => {
      const res = await fetchProductPage(t.url, t.slug, { useCache: !opts.incremental });
      if (res.ok && res.html) {
        htmlByWpId.set(t.wp_id, res.html);
        res.fromCache ? stats.pagesFromCache++ : stats.pagesCrawled++;
        upsertCrawlRecord(db, {
          url: t.url, kind: 'product', status: 'complete',
          httpStatus: res.status, attempts: res.attempts, contentHash: res.htmlHash,
        });
      } else {
        stats.pagesFailed++;
        stats.failedUrls.push({ url: t.url, status: res.status, error: res.error ?? 'unknown' });
        upsertCrawlRecord(db, {
          url: t.url, kind: 'product', status: 'failed',
          httpStatus: res.status, attempts: res.attempts, error: res.error ?? 'unknown',
        });
      }
      // Checkpoint to disk periodically so a hard kill loses almost nothing.
      if (++processed % 200 === 0) {
        saveState({ ...loadState(), runId, lastCheckpoint: new Date().toISOString(), processed, total: targets.length });
      }
    }, (done, total) => log.progress(done, total, 'product pages'));

    // Pull any previously cached pages that this run skipped.
    for (const p of wp) {
      if (htmlByWpId.has(p.id)) continue;
      const cached = readRawHtml(p.slug);
      if (cached) htmlByWpId.set(p.id, cached);
    }
  } else {
    for (const p of wp) {
      const cached = readRawHtml(p.slug);
      if (cached) htmlByWpId.set(p.id, cached);
    }
    log.info(`api-only phase — reusing ${htmlByWpId.size} cached product pages`);
  }

  // ------------------------------------------------------------- normalise
  log.info('── normalise ──');
  const normalised: NormalisedProduct[] = wp.map((p) =>
    normaliseProduct({
      wp: p,
      store: storeIndex.get(p.id),
      html: htmlByWpId.get(p.id) ?? null,
      termIndex,
      sourceDomain: CONFIG.sourceDomain,
    }),
  );
  stats.productsParsed = normalised.length;

  // ------------------------------------------------------------ deduplicate
  const dedupe = deduplicate(normalised);
  stats.duplicatesRemoved = dedupe.duplicatesRemoved;
  log.info(`normalised ${normalised.length} products, ${dedupe.duplicatesRemoved} duplicates collapsed`);

  stats.completedAt = new Date().toISOString();
  saveState({ runId, completedAt: stats.completedAt, stats });

  return { stats, db, products: dedupe.products, terms, alternates: dedupe.alternates };
}

export type { NormalisedProduct, TaxonomyTerm };
