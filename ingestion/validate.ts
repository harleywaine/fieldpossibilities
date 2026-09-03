/** Post-crawl validation and coverage report (brief §15). */
import type { DatabaseSync } from 'node:sqlite';
import type { NormalisedProduct } from './normalise.ts';
import type { CrawlStats } from './crawler.ts';

export interface ValidationReport {
  generatedAt: string;
  pagesDiscovered: number;
  pagesCrawled: number;
  pagesFromCache: number;
  pagesFailed: number;
  productsDiscovered: number;
  productsParsed: number;
  duplicatesRemoved: number;
  coveragePct: number;
  detailCoveragePct: number;
  missing: Record<string, number>;
  populated: Record<string, number>;
  distributions: {
    manufacturers: Array<{ name: string; count: number }>;
    aircraftModels: Array<{ name: string; count: number }>;
    maintenanceCategories: Array<{ name: string; count: number }>;
    engines: Array<{ name: string; count: number }>;
    leadTimeBuckets: Array<{ name: string; count: number }>;
  };
  brokenProductLinks: number;
  /** Listings whose SKU disagrees with the part number in their title. */
  partNumberConflicts: number;
  missingImages: number;
  placeholderImages: number;
  failedUrls: Array<{ url: string; status: number; error: string }>;
  warnings: string[];
}

const pct = (n: number, d: number) => (d > 0 ? Number(((n / d) * 100).toFixed(1)) : 0);

function tally(items: Array<string | null>, limit = 40) {
  const m = new Map<string, number>();
  for (const i of items) {
    if (!i) continue;
    m.set(i, (m.get(i) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function validate(products: NormalisedProduct[], stats: CrawlStats): ValidationReport {
  const total = products.length;

  const countMissing = (f: (p: NormalisedProduct) => unknown) =>
    products.filter((p) => {
      const v = f(p);
      return v === null || v === undefined || (typeof v === 'string' && !v.trim());
    }).length;

  const missing = {
    part_number: countMissing((p) => p.part_number),
    description: countMissing((p) => p.description),
    manufacturer: countMissing((p) => p.manufacturer),
    aircraft_model: countMissing((p) => p.aircraft_model),
    application: countMissing((p) => p.application),
    maintenance_category: countMissing((p) => p.maintenance_category),
    engine: countMissing((p) => p.engine),
    lead_time_days: countMissing((p) => p.lead_time_days),
    weight: countMissing((p) => p.weight),
    dimensions: countMissing((p) => p.dimensions),
    images: products.filter((p) => p.images.length === 0).length,
  };

  const populated = Object.fromEntries(
    Object.entries(missing).map(([k, v]) => [k, total - v]),
  ) as Record<string, number>;

  const leadBuckets = new Map<string, number>();
  for (const p of products) {
    const d = p.lead_time_days;
    const key =
      d === null ? 'not published'
        : d <= 30 ? '≤ 30 days'
          : d <= 60 ? '31–60 days'
            : d <= 70 ? '61–70 days'
              : d <= 90 ? '71–90 days' : '> 90 days';
    leadBuckets.set(key, (leadBuckets.get(key) ?? 0) + 1);
  }

  const warnings: string[] = [];
  if (missing.lead_time_days > total * 0.5) {
    warnings.push(
      `Lead time is published for only ${total - missing.lead_time_days} of ${total} products ` +
      `(${pct(total - missing.lead_time_days, total)}%). Delivery-constrained queries must state this openly.`,
    );
  }
  if (missing.engine > total * 0.9) {
    warnings.push(
      `Engine is named in source text for only ${total - missing.engine} of ${total} products. ` +
      `Engine must never be inferred from aircraft model.`,
    );
  }
  if (stats.pagesFailed > 0) {
    warnings.push(`${stats.pagesFailed} product pages failed to crawl; their lead time / weight / dimensions are unknown.`);
  }
  const conflicts = products.filter((p) => p.part_number_in_title).length;
  if (conflicts > 0) {
    warnings.push(
      `${conflicts} listings record one part number in the SKU and a different one in the title. ` +
      `Both are retained and shown; the source does not resolve which is correct.`,
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    pagesDiscovered: stats.productUrlsDiscovered,
    pagesCrawled: stats.pagesCrawled,
    pagesFromCache: stats.pagesFromCache,
    pagesFailed: stats.pagesFailed,
    productsDiscovered: stats.apiRecords,
    productsParsed: stats.productsParsed,
    duplicatesRemoved: stats.duplicatesRemoved,
    coveragePct: pct(stats.productsParsed, stats.apiRecords),
    detailCoveragePct: pct(products.filter((p) => p.detail_crawled).length, total),
    missing,
    populated,
    distributions: {
      manufacturers: tally(products.map((p) => p.manufacturer)),
      aircraftModels: tally(products.flatMap((p) => p.aircraft_models)),
      maintenanceCategories: tally(products.map((p) => p.maintenance_category)),
      engines: tally(products.map((p) => p.engine)),
      leadTimeBuckets: [...leadBuckets.entries()].map(([name, count]) => ({ name, count })),
    },
    brokenProductLinks: products.filter((p) => !p.product_url).length,
    partNumberConflicts: products.filter((p) => p.part_number_in_title).length,
    missingImages: products.filter((p) => p.images.length === 0).length,
    placeholderImages: products.filter((p) => p.images.length > 0 && p.images.every((i) => i.isPlaceholder)).length,
    failedUrls: stats.failedUrls.slice(0, 200),
    warnings,
  };
}

/** Human-readable crawl report in the shape the brief illustrates (§15, §48). */
export function formatReport(r: ValidationReport, total: number): string {
  const row = (label: string, value: string | number) =>
    `${label.padEnd(28)}${String(value).padStart(9)}`;
  const L: string[] = [];
  L.push('FIELD CATALOGUE INGESTION');
  L.push('');
  L.push(row('Product URLs discovered', r.pagesDiscovered.toLocaleString()));
  L.push(row('Pages crawled', r.pagesCrawled.toLocaleString()));
  L.push(row('Pages served from cache', r.pagesFromCache.toLocaleString()));
  L.push(row('Products discovered', r.productsDiscovered.toLocaleString()));
  L.push(row('Products parsed', r.productsParsed.toLocaleString()));
  L.push(row('Duplicates removed', r.duplicatesRemoved.toLocaleString()));
  L.push(row('Failed pages', r.pagesFailed.toLocaleString()));
  L.push('');
  L.push(row('Coverage', `${r.coveragePct}%`));
  L.push(row('Detail-page coverage', `${r.detailCoveragePct}%`));
  L.push('');
  L.push('FIELD POPULATION');
  for (const [k, v] of Object.entries(r.populated)) {
    L.push(row(`  ${k}`, `${v.toLocaleString()} (${pct(v, total)}%)`));
  }
  if (r.warnings.length) {
    L.push('');
    L.push('DATA HONESTY NOTES');
    for (const w of r.warnings) L.push(`  • ${w}`);
  }
  return L.join('\n');
}
