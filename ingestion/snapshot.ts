/** Immutable dated catalogue snapshots (brief §14, §36). */
import { writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from './config.ts';
import type { NormalisedProduct } from './normalise.ts';
import type { TaxonomyTerm } from './discovery.ts';
import type { CrawlStats } from './crawler.ts';
import type { ValidationReport } from './validate.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('snapshot');

const CSV_COLUMNS = [
  'id', 'part_number', 'name', 'manufacturer', 'aircraft_model', 'application',
  'maintenance_category', 'engine', 'equipment_type', 'lead_time_days', 'weight',
  'dimensions', 'condition', 'availability', 'product_url', 'source_url', 'scraped_at',
] as const;

function toCsv(products: NormalisedProduct[]): string {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const rows = [CSV_COLUMNS.join(',')];
  for (const p of products) {
    rows.push(CSV_COLUMNS.map((c) => esc((p as any)[c])).join(','));
  }
  return rows.join('\n');
}

export interface SnapshotMeta {
  source: string;
  source_domain: string;
  crawl_started: string;
  crawl_completed: string | null;
  crawl_mode: string;
  product_count: number;
  source_pages: number;
  failed_pages: number;
  duplicates_removed: number;
  detail_coverage_pct: number;
  taxonomy_terms: number;
  snapshot_date: string;
  notes: string[];
}

export function writeSnapshot(
  products: NormalisedProduct[],
  terms: TaxonomyTerm[],
  stats: CrawlStats,
  report: ValidationReport,
): { dir: string; meta: SnapshotMeta } {
  const date = new Date().toISOString().slice(0, 10);
  const dir = join(CONFIG.paths.snapshots, date);
  mkdirSync(dir, { recursive: true });
  mkdirSync(CONFIG.paths.catalogue, { recursive: true });

  const meta: SnapshotMeta = {
    source: CONFIG.sourceName,
    source_domain: CONFIG.sourceDomain,
    crawl_started: stats.startedAt,
    crawl_completed: stats.completedAt,
    crawl_mode: stats.mode,
    product_count: products.length,
    source_pages: stats.productUrlsDiscovered,
    failed_pages: stats.pagesFailed,
    duplicates_removed: stats.duplicatesRemoved,
    detail_coverage_pct: report.detailCoveragePct,
    taxonomy_terms: terms.length,
    snapshot_date: date,
    notes: [
      'Catalogue data is a snapshot of publicly available Field International listings.',
      'Fields absent from the source are stored as null and are never inferred.',
      ...report.warnings,
    ],
  };

  const json = JSON.stringify(products, null, 1);
  const csv = toCsv(products);

  // Snapshot copy (dated, immutable) …
  writeFileSync(join(dir, 'products.json'), json);
  writeFileSync(join(dir, 'products.csv'), csv);
  writeFileSync(join(dir, 'taxonomy.json'), JSON.stringify(terms, null, 1));
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
  writeFileSync(join(dir, 'validation.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(dir, 'crawl-stats.json'), JSON.stringify(stats, null, 2));

  // … and the current working snapshot the application reads.
  writeFileSync(join(CONFIG.paths.catalogue, 'products.json'), json);
  writeFileSync(join(CONFIG.paths.catalogue, 'products.csv'), csv);
  writeFileSync(join(CONFIG.paths.catalogue, 'taxonomy.json'), JSON.stringify(terms, null, 1));
  writeFileSync(join(CONFIG.paths.catalogue, 'metadata.json'), JSON.stringify(meta, null, 2));
  writeFileSync(join(CONFIG.paths.catalogue, 'validation.json'), JSON.stringify(report, null, 2));

  log.info(`snapshot ${date}: ${products.length} products → ${dir}`);
  return { dir, meta };
}

export function listSnapshots(): string[] {
  if (!existsSync(CONFIG.paths.snapshots)) return [];
  const { readdirSync } = require('node:fs');
  return readdirSync(CONFIG.paths.snapshots).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
}
