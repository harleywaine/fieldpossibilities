#!/usr/bin/env node
/**
 * Rebuilds the database, search index and vector index from already-persisted
 * raw payloads — no network access (brief §45 `scripts/rebuild-index.ts`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../ingestion/config.ts';
import type { WpProduct, StoreProduct } from '../ingestion/catalogue.ts';
import type { TaxonomyTerm } from '../ingestion/discovery.ts';
import { openDb, createSchema, ensureDirs } from '../ingestion/storage.ts';
import { normaliseProduct } from '../ingestion/normalise.ts';
import { deduplicate } from '../ingestion/deduplicate.ts';
import { writeProducts, writeTaxonomy, buildSearchIndex } from '../ingestion/writer.ts';
import { buildVectorIndex } from '../ingestion/embeddings.ts';
import { readRawHtml } from '../ingestion/product.ts';
import { validate, formatReport } from '../ingestion/validate.ts';
import { writeSnapshot } from '../ingestion/snapshot.ts';
import { makeLogger } from '../ingestion/logger.ts';

const log = makeLogger('rebuild');
ensureDirs();

const read = (f: string) => JSON.parse(readFileSync(join(CONFIG.paths.rawApi, f), 'utf8'));
const wp = read('wp-products.json') as WpProduct[];
const store = read('store-products.json') as StoreProduct[];
const terms = read('taxonomy-terms.json') as TaxonomyTerm[];

const termIndex = new Map<string, TaxonomyTerm>(terms.map((t) => [`${t.taxonomy}:${t.id}`, t]));
const storeIndex = new Map<number, StoreProduct>(store.map((s) => [s.id, s]));

let withHtml = 0;
const normalised = wp.map((p) => {
  const html = readRawHtml(p.slug);
  if (html) withHtml++;
  return normaliseProduct({
    wp: p, store: storeIndex.get(p.id), html, termIndex, sourceDomain: CONFIG.sourceDomain,
  });
});
log.info(`normalised ${normalised.length} products (${withHtml} with crawled detail pages)`);

const dedupe = deduplicate(normalised);
const db = openDb();
createSchema(db);
writeTaxonomy(db, terms);
writeProducts(db, dedupe.products, dedupe.alternates);
buildSearchIndex(db, dedupe.products);
await buildVectorIndex(db, dedupe.products);

const stats: any = {
  runId: 'rebuild', mode: 'rebuild', startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(), sitemapUrls: 0,
  productUrlsDiscovered: wp.length, taxonomyUrls: 0, cataloguePages: 0,
  apiRecords: wp.length, pagesCrawled: 0, pagesFromCache: withHtml, pagesFailed: 0,
  productsParsed: dedupe.products.length, duplicatesRemoved: dedupe.duplicatesRemoved,
  changed: 0, unchanged: 0, new: 0, failedUrls: [],
};
const report = validate(dedupe.products, stats);
if (!process.env.SKIP_SNAPSHOT) writeSnapshot(dedupe.products, terms, stats, report);

db.prepare(
  'INSERT OR REPLACE INTO crawl_runs (id, mode, started_at, completed_at, stats_json) VALUES (?,?,?,?,?)',
).run(
  `rebuild-${stats.startedAt}`, 'rebuild', stats.startedAt, stats.completedAt,
  JSON.stringify({ stats, report: { ...report, failedUrls: [] } }),
);
db.close();
console.log('\n' + formatReport(report, dedupe.products.length));
