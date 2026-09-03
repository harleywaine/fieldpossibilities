import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { catalogueStats, catalogueMeta, db } from '@/lib/db/client.ts';
import { embeddingInfo } from '@/lib/search/semantic.ts';

export const dynamic = 'force-dynamic';

interface Validation {
  pagesDiscovered: number; pagesCrawled: number; pagesFromCache: number; pagesFailed: number;
  productsDiscovered: number; productsParsed: number; duplicatesRemoved: number;
  coveragePct: number; detailCoveragePct: number;
  populated: Record<string, number>; missing: Record<string, number>;
  distributions: {
    manufacturers: Array<{ name: string; count: number }>;
    aircraftModels: Array<{ name: string; count: number }>;
    maintenanceCategories: Array<{ name: string; count: number }>;
    engines: Array<{ name: string; count: number }>;
    leadTimeBuckets: Array<{ name: string; count: number }>;
  };
  missingImages: number; placeholderImages: number; partNumberConflicts?: number;
  failedUrls: Array<{ url: string; status: number; error: string }>;
  warnings: string[];
}

export default function IngestionPage() {
  let stats = null, meta = null, validation: Validation | null = null, changed = 0;
  try { stats = catalogueStats(); } catch { /* not ingested */ }
  try { meta = catalogueMeta(); } catch { /* not ingested */ }

  const vPath = join(process.cwd(), 'data/catalogue/validation.json');
  if (existsSync(vPath)) {
    try { validation = JSON.parse(readFileSync(vPath, 'utf8')); } catch { /* ignore */ }
  }
  try {
    changed = Number((db().prepare(
      "SELECT COUNT(*) n FROM product_history WHERE change_kind = 'changed'").get() as any).n);
  } catch { /* ignore */ }

  const snapshots = safeSnapshots();
  const emb = safeEmbedding();

  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card p-6">
          <h1 className="text-lg font-semibold">No ingestion yet</h1>
          <p className="mt-2 text-sm text-ink-600">
            Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run scrape</code>.
          </p>
        </div>
      </div>
    );
  }

  const pct = (n: number) => (stats!.products ? ((n / stats!.products) * 100).toFixed(1) : '0.0');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Catalogue ingestion</h1>
        <p className="mt-1 text-sm text-ink-600">
          Technical view of the crawl that produced the dataset behind this prototype.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Products" value={stats.products.toLocaleString()} />
        <Stat label="Detail pages crawled" value={`${stats.detailCrawled.toLocaleString()} (${pct(stats.detailCrawled)}%)`} />
        <Stat label="Published lead times" value={`${stats.withLeadTime.toLocaleString()} (${pct(stats.withLeadTime)}%)`} />
        <Stat label="Changed since last crawl" value={changed.toLocaleString()} />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <Panel title="Last crawl">
          <Row k="Completed" v={stats.lastCrawl ? new Date(stats.lastCrawl).toLocaleString('en-GB') : '—'} />
          <Row k="Mode" v={meta?.crawl_mode ?? '—'} />
          <Row k="Product URLs discovered" v={validation ? validation.pagesDiscovered.toLocaleString() : '—'} />
          <Row k="Pages crawled" v={validation ? validation.pagesCrawled.toLocaleString() : '—'} />
          <Row k="Failed pages" v={validation ? validation.pagesFailed.toLocaleString() : '0'} />
          <Row k="Duplicates removed" v={validation ? validation.duplicatesRemoved.toLocaleString() : '—'} />
          <Row k="Coverage" v={validation ? `${validation.coveragePct}%` : '—'} />
          <Row k="Part-number conflicts" v={validation?.partNumberConflicts?.toLocaleString() ?? '—'} />
        </Panel>

        <Panel title="Indexes">
          <Row k="Search index" v="✓ FTS5 current" />
          <Row k="Embeddings" v={emb.model ? `✓ ${emb.model}` : '—'} />
          <Row k="Vectors" v={emb.vectors ? emb.vectors.toLocaleString() : '—'} />
          <Row k="Built" v={emb.createdAt ? new Date(emb.createdAt).toLocaleString('en-GB') : '—'} />
          <Row k="Snapshots" v={snapshots.length ? snapshots.join(', ') : '—'} />
        </Panel>
      </section>

      {validation && (
        <>
          <section className="mb-8">
            <Panel title="Field population">
              <p className="mb-3 text-xs text-ink-500">
                Measured, not asserted. A low figure means the source does not publish that field —
                the prototype leaves it null rather than filling it in.
              </p>
              <div className="space-y-1.5">
                {Object.entries(validation.populated).map(([k, v]) => {
                  const p = Number(pct(v));
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 text-xs text-ink-600">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className={`h-full rounded-full ${p > 60 ? 'bg-[color:var(--color-strong-600)]' : p > 20 ? 'bg-signal-500' : 'bg-[color:var(--color-caution-600)]'}`}
                          style={{ width: `${Math.max(p, 1)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-ink-500">
                        {v.toLocaleString()} · {p}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>

          {validation.warnings.length > 0 && (
            <section className="mb-8 rounded-xl border border-[color:var(--color-caution-600)]/25 bg-[color:var(--color-caution-600)]/8 p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-caution-600)] [color:var(--color-caution-400)]">
                Data honesty notes
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {validation.warnings.map((w) => (
                  <li key={w} className="text-xs leading-relaxed text-ink-700">{w}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <Dist title="Aircraft models" items={validation.distributions.aircraftModels.slice(0, 12)} />
            <Dist title="Maintenance categories" items={validation.distributions.maintenanceCategories.slice(0, 12)} />
            <Dist title="Lead time" items={validation.distributions.leadTimeBuckets} />
            <Dist title="Engines named in source" items={validation.distributions.engines.slice(0, 12)} />
          </section>
        </>
      )}
    </div>
  );
}

function safeSnapshots(): string[] {
  const dir = join(process.cwd(), 'data/snapshots');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse().slice(0, 5);
  } catch { return []; }
}

function safeEmbedding() {
  try { return embeddingInfo(); } catch { return { model: null, createdAt: null, vectors: 0 }; }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xl font-semibold tabular-nums tracking-tight text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h2>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1.5 last:border-0">
      <span className="text-xs text-ink-500">{k}</span>
      <span className="text-xs font-medium text-ink-800">{v}</span>
    </div>
  );
}

function Dist({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <Panel title={title}>
      <div className="space-y-1">
        {items.map((i) => (
          <div key={i.name} className="flex items-center gap-2">
            <span className="w-40 shrink-0 truncate text-xs text-ink-600" title={i.name}>
              {i.name}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-signal-500/70" style={{ width: `${(i.count / max) * 100}%` }} />
            </div>
            <span className="w-12 shrink-0 text-right text-xs tabular-nums text-ink-400">
              {i.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
