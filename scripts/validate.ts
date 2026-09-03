#!/usr/bin/env node
/**
 * Validation report against the stored catalogue (brief §15).
 * Reads the persisted snapshot — no network access.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../ingestion/config.ts';
import { formatReport, type ValidationReport } from '../ingestion/validate.ts';

const path = join(CONFIG.paths.catalogue, 'validation.json');
if (!existsSync(path)) {
  console.error('No validation report found. Run `npm run scrape` first.');
  process.exit(1);
}

const report = JSON.parse(readFileSync(path, 'utf8')) as ValidationReport;
const products = JSON.parse(
  readFileSync(join(CONFIG.paths.catalogue, 'products.json'), 'utf8'),
) as unknown[];

console.log(formatReport(report, products.length));

if (report.failedUrls.length) {
  console.log('\nFAILED URLS');
  for (const f of report.failedUrls.slice(0, 25)) {
    console.log(`  ${String(f.status).padEnd(4)} ${f.error.slice(0, 40).padEnd(42)} ${f.url}`);
  }
  if (report.failedUrls.length > 25) {
    console.log(`  … and ${report.failedUrls.length - 25} more`);
  }
}

// A crawl that lost more than 2% of the catalogue should fail CI.
const lost = report.productsDiscovered - report.productsParsed;
if (report.productsDiscovered > 0 && lost / report.productsDiscovered > 0.02) {
  console.error(`\nFAIL: ${lost} products discovered but not parsed.`);
  process.exit(1);
}
