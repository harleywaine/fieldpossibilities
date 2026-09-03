#!/usr/bin/env node
/** Compact ingestion status for the terminal (brief §48). */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from '../ingestion/config.ts';
import { openDb } from '../ingestion/storage.ts';

const metaPath = join(CONFIG.paths.catalogue, 'metadata.json');
if (!existsSync(metaPath)) {
  console.error('No catalogue found. Run `npm run scrape` first.');
  process.exit(1);
}

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const db = openDb();
const n = (sql: string) => Number((db.prepare(sql).get() as any).n);

const total = n('SELECT COUNT(*) n FROM products');
const changed = n("SELECT COUNT(*) n FROM product_history WHERE change_kind='changed'");
const emb = db.prepare(
  'SELECT embedding_model m, embedding_created_at c, COUNT(*) n FROM product_vectors').get() as any;
const fts = (() => {
  try { return n('SELECT COUNT(*) n FROM products_fts'); } catch { return 0; }
})();

const snapshots = existsSync(CONFIG.paths.snapshots)
  ? readdirSync(CONFIG.paths.snapshots).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
  : [];

const pct = (v: number) => `${((v / Math.max(total, 1)) * 100).toFixed(1)}%`;
const row = (k: string, v: string | number) => console.log(`${k.padEnd(26)}${String(v).padStart(14)}`);

console.log('\nCATALOGUE INGESTION\n');
row('Last crawl', meta.crawl_completed ? new Date(meta.crawl_completed).toLocaleString('en-GB') : '—');
row('Mode', meta.crawl_mode ?? '—');
row('Products', total.toLocaleString());
row('Catalogue pages', Number(meta.source_pages ?? 0).toLocaleString());
row('Successful', (Number(meta.source_pages ?? 0) - Number(meta.failed_pages ?? 0)).toLocaleString());
row('Failed', Number(meta.failed_pages ?? 0).toLocaleString());
row('Changed since previous', changed.toLocaleString());
console.log('');
row('Detail pages crawled', `${n('SELECT COUNT(*) n FROM products WHERE detail_crawled=1').toLocaleString()} (${pct(n('SELECT COUNT(*) n FROM products WHERE detail_crawled=1'))})`);
row('Published lead times', `${n('SELECT COUNT(*) n FROM products WHERE lead_time_days IS NOT NULL').toLocaleString()} (${pct(n('SELECT COUNT(*) n FROM products WHERE lead_time_days IS NOT NULL'))})`);
row('Engines named', `${n('SELECT COUNT(*) n FROM products WHERE engine IS NOT NULL').toLocaleString()} (${pct(n('SELECT COUNT(*) n FROM products WHERE engine IS NOT NULL'))})`);
console.log('');
row('Search index', fts ? `✓ ${fts.toLocaleString()} docs` : '✗ missing');
row('Embeddings', emb?.m ? `✓ ${emb.m}` : '✗ missing');
row('Snapshots', snapshots.length ? snapshots[snapshots.length - 1] : '—');
console.log('');
db.close();
