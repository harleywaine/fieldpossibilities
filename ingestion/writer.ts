/** Persists normalised products, taxonomy and the search index into SQLite. */
import type { DatabaseSync } from 'node:sqlite';
import type { NormalisedProduct } from './normalise.ts';
import type { TaxonomyTerm } from './discovery.ts';
import { searchDocument } from './normalise.ts';
import { createSearchIndex } from './storage.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('writer');

export interface WriteStats { inserted: number; changed: number; unchanged: number; new: number }

export function writeTaxonomy(db: DatabaseSync, terms: TaxonomyTerm[]): void {
  const stmt = db.prepare(`
    INSERT INTO taxonomy_terms (taxonomy, term_id, name, slug, count, parent, link, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(taxonomy, term_id) DO UPDATE SET
      name=excluded.name, slug=excluded.slug, count=excluded.count,
      parent=excluded.parent, link=excluded.link, description=excluded.description
  `);
  db.exec('BEGIN');
  for (const t of terms) {
    stmt.run(t.taxonomy, t.id, t.name, t.slug, t.count, t.parent, t.link, t.description);
  }
  db.exec('COMMIT');
  log.info(`taxonomy: ${terms.length} terms written`);
}

export function writeProducts(
  db: DatabaseSync,
  products: NormalisedProduct[],
  alternates: Map<string, Set<string>>,
): WriteStats {
  const prior = new Map<string, { hash: string; first_seen: string | null }>(
    db.prepare('SELECT id, content_hash, first_seen FROM products').all()
      .map((r: any) => [r.id, { hash: r.content_hash, first_seen: r.first_seen }]),
  );

  const upsert = db.prepare(`
    INSERT INTO products (
      id, wp_id, part_number, part_number_in_title, name, title, description, description_html, short_description,
      manufacturer, aircraft_manufacturer, aircraft_family, aircraft_model, aircraft_variant,
      engine, application, maintenance_category, product_category, equipment_type,
      weight, dimensions, material, condition, availability, lead_time_days,
      stock_status, stock_location, ce_marked, request_quote_url, product_url, canonical_url,
      source_url, source_domain, content_hash, html_hash, scraped_at, first_seen, last_seen,
      modified_at, detail_crawled
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      part_number=excluded.part_number, part_number_in_title=excluded.part_number_in_title,
      name=excluded.name, title=excluded.title,
      description=excluded.description, description_html=excluded.description_html,
      short_description=excluded.short_description, manufacturer=excluded.manufacturer,
      aircraft_manufacturer=excluded.aircraft_manufacturer, aircraft_family=excluded.aircraft_family,
      aircraft_model=excluded.aircraft_model, engine=excluded.engine, application=excluded.application,
      maintenance_category=excluded.maintenance_category, product_category=excluded.product_category,
      equipment_type=excluded.equipment_type, weight=excluded.weight, dimensions=excluded.dimensions,
      condition=excluded.condition, availability=excluded.availability,
      lead_time_days=excluded.lead_time_days, stock_status=excluded.stock_status,
      stock_location=excluded.stock_location, ce_marked=excluded.ce_marked,
      canonical_url=excluded.canonical_url, source_url=excluded.source_url,
      content_hash=excluded.content_hash, html_hash=excluded.html_hash,
      scraped_at=excluded.scraped_at, last_seen=excluded.last_seen,
      modified_at=excluded.modified_at, detail_crawled=excluded.detail_crawled
  `);

  const insTerm = db.prepare(
    'INSERT OR IGNORE INTO product_terms (product_id, taxonomy, term_id) VALUES (?,?,?)');
  // Preserve any locally cached file: re-ingesting metadata must not orphan the
  // downloaded image, which is keyed on the source URL and still valid.
  const insImg = db.prepare(`INSERT INTO product_images
    (product_id, position, src, thumbnail, alt, local_path, is_placeholder) VALUES (?,?,?,?,?,NULL,?)
    ON CONFLICT(product_id, position) DO UPDATE SET
      src = excluded.src,
      thumbnail = excluded.thumbnail,
      alt = excluded.alt,
      is_placeholder = excluded.is_placeholder,
      local_path = CASE
        WHEN product_images.src = excluded.src THEN product_images.local_path
        ELSE NULL
      END`);
  const insSrc = db.prepare(
    'INSERT OR IGNORE INTO product_sources (product_id, source_url, kind, discovered_at) VALUES (?,?,?,?)');
  const insHist = db.prepare(
    'INSERT OR REPLACE INTO product_history (product_id, observed_at, content_hash, change_kind) VALUES (?,?,?,?)');

  const now = new Date().toISOString();
  const stats: WriteStats = { inserted: 0, changed: 0, unchanged: 0, new: 0 };

  db.exec('BEGIN');
  try {
    for (const p of products) {
      const was = prior.get(p.id);
      const changeKind = !was ? 'new' : was.hash !== p.content_hash ? 'changed' : 'unchanged';
      if (changeKind === 'new') stats.new++;
      else if (changeKind === 'changed') stats.changed++;
      else stats.unchanged++;

      upsert.run(
        p.id, p.wp_id, p.part_number, p.part_number_in_title, p.name, p.title, p.description, p.description_html,
        p.short_description, p.manufacturer, p.aircraft_manufacturer, p.aircraft_family,
        p.aircraft_model, p.aircraft_variant, p.engine, p.application, p.maintenance_category,
        p.product_category, p.equipment_type, p.weight, p.dimensions, p.material, p.condition,
        p.availability, p.lead_time_days, p.stock_status, p.stock_location,
        p.ce_marked === null ? null : p.ce_marked ? 1 : 0,
        p.request_quote_url, p.product_url, p.canonical_url, p.source_url, p.source_domain,
        p.content_hash, p.html_hash, p.scraped_at, was?.first_seen ?? now, now,
        p.modified_at, p.detail_crawled ? 1 : 0,
      );
      stats.inserted++;

      for (const t of p.terms) insTerm.run(p.id, t.taxonomy, t.term_id);
      p.images.forEach((im, i) =>
        insImg.run(p.id, i, im.src, im.thumbnail, im.alt, im.isPlaceholder ? 1 : 0));
      for (const u of alternates.get(p.id) ?? [p.canonical_url]) {
        insSrc.run(p.id, u, u === p.canonical_url ? 'canonical' : 'alternate', now);
      }
      if (changeKind !== 'unchanged') insHist.run(p.id, now, p.content_hash, changeKind);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  log.info(`products: ${stats.inserted} written (${stats.new} new, ${stats.changed} changed, ${stats.unchanged} unchanged)`);
  return stats;
}

export function buildSearchIndex(db: DatabaseSync, products: NormalisedProduct[]): void {
  createSearchIndex(db);
  const stmt = db.prepare(`INSERT INTO products_fts
    (product_id, part_number, name, application, aircraft, engine, category, manufacturer, description)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  db.exec('BEGIN');
  for (const p of products) {
    stmt.run(
      p.id, p.part_number ?? '', p.name, p.application ?? '', p.aircraft_model ?? '',
      p.engine ?? '', [p.maintenance_category, p.equipment_type, ...p.applications].filter(Boolean).join(' '),
      p.manufacturer ?? '', searchDocument(p),
    );
  }
  db.exec('COMMIT');
  log.info(`search index: ${products.length} documents`);
}
