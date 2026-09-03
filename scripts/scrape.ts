#!/usr/bin/env node
/**
 * Full catalogue ingestion (brief §34).
 *
 *   npm run scrape                 full crawl (resumes from checkpoint)
 *   npm run scrape:incremental     revisit known URLs, detect changes
 *   npm run scrape:api             API records only, reuse cached pages
 *   npm run scrape -- --limit=200  bounded run for development
 */
import { runCrawl } from '../ingestion/crawler.ts';
import { writeProducts, writeTaxonomy, buildSearchIndex } from '../ingestion/writer.ts';
import { validate, formatReport } from '../ingestion/validate.ts';
import { writeSnapshot } from '../ingestion/snapshot.ts';
import { buildVectorIndex } from '../ingestion/embeddings.ts';
import { makeLogger } from '../ingestion/logger.ts';

const log = makeLogger('scrape');
const argv = process.argv.slice(2);
const flag = (n: string) => argv.some((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const val = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

const opts = {
  incremental: flag('incremental'),
  phase: (val('phase') ?? 'all') as 'all' | 'api' | 'html',
  limit: val('limit') ? Number(val('limit')) : undefined,
  priority: val('priority')?.split(',').filter(Boolean),
  refreshApi: flag('refresh-api'),
};

log.info(`starting ingestion — mode=${opts.incremental ? 'incremental' : 'full'} phase=${opts.phase}`);

const { stats, db, products, terms, alternates } = await runCrawl(opts);

writeTaxonomy(db, terms);
const w = writeProducts(db, products, alternates);
stats.new = w.new; stats.changed = w.changed; stats.unchanged = w.unchanged;

buildSearchIndex(db, products);
await buildVectorIndex(db, products);

const report = validate(products, stats);
const { dir, meta } = writeSnapshot(products, terms, stats, report);

db.prepare('INSERT OR REPLACE INTO crawl_runs (id, mode, started_at, completed_at, stats_json) VALUES (?,?,?,?,?)')
  .run(stats.runId, stats.mode, stats.startedAt, stats.completedAt, JSON.stringify({ stats, report: { ...report, failedUrls: [] } }));

db.close();

console.log('\n' + '─'.repeat(46));
console.log(formatReport(report, products.length));
console.log('─'.repeat(46));
console.log(`\nSnapshot: ${dir}`);
console.log(`Database: data/catalogue/catalogue.db`);
log.info('ingestion complete');
