/**
 * Persistence: relational catalogue schema + resumable crawl state (brief §7, §13).
 * Uses node:sqlite (built in) so the demo has no native dependencies.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { CONFIG } from './config.ts';

export type CrawlStatus =
  | 'discovered' | 'queued' | 'processing' | 'complete' | 'failed' | 'skipped';

export function openDb(path = CONFIG.paths.db): DatabaseSync {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

export function createSchema(db: DatabaseSync): void {
  db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id                  TEXT PRIMARY KEY,
    wp_id               INTEGER UNIQUE,
    part_number         TEXT,
    part_number_in_title TEXT,
    name                TEXT NOT NULL,
    title               TEXT,
    description         TEXT,
    description_html    TEXT,
    short_description   TEXT,
    manufacturer        TEXT,
    aircraft_manufacturer TEXT,
    aircraft_family     TEXT,
    aircraft_model      TEXT,
    aircraft_variant    TEXT,
    engine              TEXT,
    application         TEXT,
    maintenance_category TEXT,
    product_category    TEXT,
    equipment_type      TEXT,
    weight              TEXT,
    dimensions          TEXT,
    material            TEXT,
    condition           TEXT,
    availability        TEXT,
    lead_time_days      INTEGER,
    stock_status        TEXT,
    stock_location      TEXT,
    ce_marked           INTEGER,
    request_quote_url   TEXT,
    product_url         TEXT,
    canonical_url       TEXT,
    source_url          TEXT NOT NULL,
    source_domain       TEXT NOT NULL,
    content_hash        TEXT,
    html_hash           TEXT,
    scraped_at          TEXT NOT NULL,
    first_seen          TEXT,
    last_seen           TEXT,
    modified_at         TEXT,
    detail_crawled      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS taxonomy_terms (
    taxonomy    TEXT NOT NULL,
    term_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT,
    count       INTEGER,
    parent      INTEGER,
    link        TEXT,
    description TEXT,
    PRIMARY KEY (taxonomy, term_id)
  );

  CREATE TABLE IF NOT EXISTS product_terms (
    product_id TEXT NOT NULL,
    taxonomy   TEXT NOT NULL,
    term_id    INTEGER NOT NULL,
    PRIMARY KEY (product_id, taxonomy, term_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS product_images (
    product_id  TEXT NOT NULL,
    position    INTEGER NOT NULL,
    src         TEXT NOT NULL,
    thumbnail   TEXT,
    alt         TEXT,
    local_path  TEXT,
    is_placeholder INTEGER DEFAULT 0,
    PRIMARY KEY (product_id, position),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  /* Every alternate route that reached a product (brief §11). */
  CREATE TABLE IF NOT EXISTS product_sources (
    product_id  TEXT NOT NULL,
    source_url  TEXT NOT NULL,
    kind        TEXT,
    discovered_at TEXT,
    PRIMARY KEY (product_id, source_url),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  /* Resumable crawl checkpoint table (brief §7). */
  CREATE TABLE IF NOT EXISTS crawl_records (
    url           TEXT PRIMARY KEY,
    kind          TEXT,
    status        TEXT NOT NULL,
    discovered_at TEXT,
    crawled_at    TEXT,
    http_status   INTEGER,
    attempts      INTEGER DEFAULT 0,
    error         TEXT,
    content_hash  TEXT,
    lastmod       TEXT
  );

  /* Change detection across crawls (brief §35). */
  CREATE TABLE IF NOT EXISTS product_history (
    product_id    TEXT NOT NULL,
    observed_at   TEXT NOT NULL,
    content_hash  TEXT,
    change_kind   TEXT,
    PRIMARY KEY (product_id, observed_at)
  );

  CREATE TABLE IF NOT EXISTS crawl_runs (
    id            TEXT PRIMARY KEY,
    mode          TEXT,
    started_at    TEXT,
    completed_at  TEXT,
    stats_json    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_products_part   ON products(part_number);
  CREATE INDEX IF NOT EXISTS idx_products_mfr    ON products(manufacturer);
  CREATE INDEX IF NOT EXISTS idx_products_model  ON products(aircraft_model);
  CREATE INDEX IF NOT EXISTS idx_products_cat    ON products(maintenance_category);
  CREATE INDEX IF NOT EXISTS idx_products_engine ON products(engine);
  CREATE INDEX IF NOT EXISTS idx_products_lead   ON products(lead_time_days);
  CREATE INDEX IF NOT EXISTS idx_pterms_term     ON product_terms(taxonomy, term_id);
  CREATE INDEX IF NOT EXISTS idx_crawl_status    ON crawl_records(status, kind);
  `);

  migrate(db);
}

/**
 * Additive migrations for databases created by an earlier version.
 * `CREATE TABLE IF NOT EXISTS` leaves existing tables untouched, so new columns
 * have to be added explicitly rather than silently failing at write time.
 */
function migrate(db: DatabaseSync): void {
  const expected: Record<string, Record<string, string>> = {
    products: {
      part_number_in_title: 'TEXT',
    },
    product_images: {
      local_path: 'TEXT',
    },
  };

  for (const [table, columns] of Object.entries(expected)) {
    let existing: Set<string>;
    try {
      existing = new Set(
        (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).map((r) => String(r.name)),
      );
    } catch {
      continue; // table not present yet
    }
    for (const [name, type] of Object.entries(columns)) {
      if (!existing.has(name)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
      }
    }
  }
}

/** FTS5 index over the searchable product document (brief §16B). */
export function createSearchIndex(db: DatabaseSync): void {
  db.exec(`DROP TABLE IF EXISTS products_fts;`);
  db.exec(`
    CREATE VIRTUAL TABLE products_fts USING fts5(
      product_id UNINDEXED,
      part_number,
      name,
      application,
      aircraft,
      engine,
      category,
      manufacturer,
      description,
      tokenize = 'porter unicode61 remove_diacritics 2'
    );
  `);
}

export interface CrawlRecordInput {
  url: string;
  kind: string;
  status: CrawlStatus;
  lastmod?: string | null;
  httpStatus?: number | null;
  attempts?: number;
  error?: string | null;
  contentHash?: string | null;
}

export function upsertCrawlRecord(db: DatabaseSync, r: CrawlRecordInput): void {
  db.prepare(`
    INSERT INTO crawl_records (url, kind, status, discovered_at, crawled_at, http_status, attempts, error, content_hash, lastmod)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      status       = excluded.status,
      crawled_at   = COALESCE(excluded.crawled_at, crawl_records.crawled_at),
      http_status  = COALESCE(excluded.http_status, crawl_records.http_status),
      attempts     = crawl_records.attempts + excluded.attempts,
      error        = excluded.error,
      content_hash = COALESCE(excluded.content_hash, crawl_records.content_hash),
      lastmod      = COALESCE(excluded.lastmod, crawl_records.lastmod)
  `).run(
    r.url,
    r.kind,
    r.status,
    new Date().toISOString(),
    r.status === 'complete' || r.status === 'failed' ? new Date().toISOString() : null,
    r.httpStatus ?? null,
    r.attempts ?? 0,
    r.error ?? null,
    r.contentHash ?? null,
    r.lastmod ?? null,
  );
}

/** Bulk-registers discovered URLs without clobbering already-crawled state. */
export function registerDiscovered(
  db: DatabaseSync,
  rows: Array<{ url: string; kind: string; lastmod: string | null }>,
): number {
  const stmt = db.prepare(`
    INSERT INTO crawl_records (url, kind, status, discovered_at, attempts, lastmod)
    VALUES (?, ?, 'discovered', ?, 0, ?)
    ON CONFLICT(url) DO UPDATE SET lastmod = COALESCE(excluded.lastmod, crawl_records.lastmod)
  `);
  const now = new Date().toISOString();
  let n = 0;
  db.exec('BEGIN');
  try {
    for (const r of rows) {
      stmt.run(r.url, r.kind, now, r.lastmod);
      n++;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return n;
}

export function pendingUrls(db: DatabaseSync, kind: string): string[] {
  return db
    .prepare(
      `SELECT url FROM crawl_records
       WHERE kind = ? AND status NOT IN ('complete','skipped')
       ORDER BY rowid`,
    )
    .all(kind)
    .map((r: any) => r.url as string);
}

export function ensureDirs(): void {
  for (const p of Object.values(CONFIG.paths)) {
    const dir = p.endsWith('.db') || p.endsWith('.json') ? dirname(p) : p;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}
