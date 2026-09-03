#!/usr/bin/env node
/** Writes a dated snapshot from the current database without re-crawling (§36). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../ingestion/config.ts';
import { writeSnapshot } from '../ingestion/snapshot.ts';
import type { NormalisedProduct } from '../ingestion/normalise.ts';
import type { TaxonomyTerm } from '../ingestion/discovery.ts';
import { validate } from '../ingestion/validate.ts';

const products = JSON.parse(
  readFileSync(join(CONFIG.paths.catalogue, 'products.json'), 'utf8'),
) as NormalisedProduct[];
const terms = JSON.parse(
  readFileSync(join(CONFIG.paths.catalogue, 'taxonomy.json'), 'utf8'),
) as TaxonomyTerm[];

const stats: any = {
  runId: `snapshot-${new Date().toISOString()}`, mode: 'snapshot',
  startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
  sitemapUrls: 0, productUrlsDiscovered: products.length, taxonomyUrls: 0, cataloguePages: 0,
  apiRecords: products.length, pagesCrawled: 0, pagesFromCache: 0, pagesFailed: 0,
  productsParsed: products.length, duplicatesRemoved: 0, changed: 0, unchanged: 0, new: 0,
  failedUrls: [],
};

const report = validate(products, stats);
const { dir } = writeSnapshot(products, terms, stats, report);
console.log(`Snapshot written to ${dir}`);
