/**
 * Read access to the ingested catalogue snapshot.
 *
 * The application never scrapes at request time (brief §46) — it reads the
 * persisted SQLite snapshot produced by `npm run scrape`.
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product, ProductImage, CatalogueMeta, TaxonomyTermRow } from '../catalogue/types.ts';

const DB_PATH = process.env.CATALOGUE_DB ?? join(process.cwd(), 'data/catalogue/catalogue.db');
const META_PATH = join(process.cwd(), 'data/catalogue/metadata.json');

let cached: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (cached) return cached;
  if (!existsSync(DB_PATH)) {
    throw new Error(
      `Catalogue database not found at ${DB_PATH}. Run \`npm run scrape\` to ingest the Field catalogue.`,
    );
  }
  cached = new DatabaseSync(DB_PATH, { readOnly: true });
  return cached;
}

export function catalogueAvailable(): boolean {
  return existsSync(DB_PATH);
}

export function catalogueMeta(): CatalogueMeta | null {
  if (!existsSync(META_PATH)) return null;
  try {
    return JSON.parse(readFileSync(META_PATH, 'utf8')) as CatalogueMeta;
  } catch {
    return null;
  }
}

const PRODUCT_COLUMNS = `
  p.id, p.part_number, p.part_number_in_title, p.name, p.description, p.short_description, p.manufacturer,
  p.aircraft_model, p.aircraft_variant, p.engine, p.application, p.maintenance_category,
  p.equipment_type, p.weight, p.dimensions, p.material, p.condition, p.availability,
  p.lead_time_days, p.stock_status, p.stock_location, p.ce_marked, p.product_url,
  p.source_url, p.source_domain, p.scraped_at, p.detail_crawled
`;

export function rowToProduct(r: any, images: ProductImage[] = []): Product {
  return {
    id: String(r.id),
    partNumber: r.part_number ?? null,
    partNumberInTitle: r.part_number_in_title ?? null,
    name: r.name,
    description: r.description ?? null,
    shortDescription: r.short_description ?? null,
    manufacturer: r.manufacturer ?? null,
    aircraftModel: r.aircraft_model ?? null,
    aircraftModels: r.aircraft_model ? String(r.aircraft_model).split(', ').filter(Boolean) : [],
    aircraftVariant: r.aircraft_variant ?? null,
    engine: r.engine ?? null,
    application: r.application ?? null,
    maintenanceCategory: r.maintenance_category ?? null,
    equipmentType: r.equipment_type ?? null,
    weight: r.weight ?? null,
    dimensions: r.dimensions ?? null,
    material: r.material ?? null,
    condition: r.condition ?? null,
    availability: r.availability ?? null,
    leadTimeDays: r.lead_time_days ?? null,
    stockStatus: r.stock_status ?? null,
    stockLocation: r.stock_location ?? null,
    ceMarked: r.ce_marked === null || r.ce_marked === undefined ? null : Boolean(r.ce_marked),
    productUrl: r.product_url ?? '',
    sourceUrl: r.source_url ?? '',
    sourceDomain: r.source_domain ?? '',
    scrapedAt: r.scraped_at ?? '',
    detailCrawled: Boolean(r.detail_crawled),
    images,
  };
}

export function imagesFor(ids: string[]): Map<string, ProductImage[]> {
  const out = new Map<string, ProductImage[]>();
  if (ids.length === 0) return out;
  const ph = ids.map(() => '?').join(',');
  const rows = db()
    .prepare(`SELECT product_id, src, thumbnail, alt, is_placeholder, local_path
              FROM product_images WHERE product_id IN (${ph}) ORDER BY product_id, position`)
    .all(...ids) as any[];
  for (const r of rows) {
    const list = out.get(r.product_id) ?? [];
    list.push({
      src: r.src,
      thumbnail: r.thumbnail ?? null,
      alt: r.alt ?? null,
      isPlaceholder: Boolean(r.is_placeholder),
      localPath: r.local_path ?? null,
    });
    out.set(r.product_id, list);
  }
  return out;
}

export function getProduct(id: string): Product | null {
  const r = db().prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.id = ?`).get(id) as any;
  if (!r) return null;
  return rowToProduct(r, imagesFor([id]).get(id) ?? []);
}

export function getProducts(ids: string[]): Product[] {
  if (ids.length === 0) return [];
  const ph = ids.map(() => '?').join(',');
  const rows = db()
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE p.id IN (${ph})`)
    .all(...ids) as any[];
  const imgs = imagesFor(ids);
  const byId = new Map(rows.map((r) => [String(r.id), rowToProduct(r, imgs.get(String(r.id)) ?? [])]));
  // Preserve caller ordering (retrieval rank).
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

export function productByPartNumber(pn: string): Product | null {
  const r = db()
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products p WHERE UPPER(p.part_number) = UPPER(?) LIMIT 1`)
    .get(pn) as any;
  return r ? rowToProduct(r, imagesFor([String(r.id)]).get(String(r.id)) ?? []) : null;
}

export function taxonomy(taxName: string): TaxonomyTermRow[] {
  return db()
    .prepare(`SELECT taxonomy, term_id, name, slug, count, parent
              FROM taxonomy_terms WHERE taxonomy = ? AND count > 0 ORDER BY count DESC`)
    .all(taxName) as any[];
}

export interface CatalogueStats {
  products: number;
  withPartNumber: number;
  withLeadTime: number;
  withEngine: number;
  withImages: number;
  detailCrawled: number;
  manufacturers: number;
  aircraftModels: number;
  maintenanceCategories: number;
  embeddingModel: string | null;
  embeddingCreatedAt: string | null;
  lastCrawl: string | null;
}

export function catalogueStats(): CatalogueStats {
  const one = (sql: string) => (db().prepare(sql).get() as any)?.n ?? 0;
  const emb = db()
    .prepare('SELECT embedding_model, embedding_created_at FROM product_vectors LIMIT 1')
    .get() as any;
  const run = db()
    .prepare('SELECT completed_at FROM crawl_runs ORDER BY started_at DESC LIMIT 1')
    .get() as any;
  return {
    products: one('SELECT COUNT(*) n FROM products'),
    withPartNumber: one("SELECT COUNT(*) n FROM products WHERE part_number IS NOT NULL AND part_number <> ''"),
    withLeadTime: one('SELECT COUNT(*) n FROM products WHERE lead_time_days IS NOT NULL'),
    withEngine: one('SELECT COUNT(*) n FROM products WHERE engine IS NOT NULL'),
    withImages: one('SELECT COUNT(DISTINCT product_id) n FROM product_images'),
    detailCrawled: one('SELECT COUNT(*) n FROM products WHERE detail_crawled = 1'),
    manufacturers: one("SELECT COUNT(*) n FROM taxonomy_terms WHERE taxonomy='product_cat' AND count>0"),
    aircraftModels: one("SELECT COUNT(*) n FROM taxonomy_terms WHERE taxonomy='aircraft-model' AND count>0"),
    maintenanceCategories: one(
      'SELECT COUNT(DISTINCT maintenance_category) n FROM products WHERE maintenance_category IS NOT NULL'),
    embeddingModel: emb?.embedding_model ?? null,
    embeddingCreatedAt: emb?.embedding_created_at ?? null,
    lastCrawl: run?.completed_at ?? null,
  };
}
