import { catalogueStats, catalogueMeta } from '@/lib/db/client.ts';
import { providerInfo } from '@/lib/ai/provider.ts';
import { DEFAULT_WEIGHTS } from '@/lib/ai/ranking.ts';

export const dynamic = 'force-dynamic';

export default function ArchitecturePage() {
  let stats = null;
  let meta = null;
  try { stats = catalogueStats(); } catch { /* not ingested */ }
  try { meta = catalogueMeta(); } catch { /* not ingested */ }
  const ai = providerInfo();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          How a plain-English requirement becomes a grounded, evidenced recommendation.
        </p>
      </header>

      {/* ------------------------------------------------ headline principle */}
      <section className="mb-10 rounded-xl border border-signal-500/25 bg-signal-500/5 p-6">
        <h2 className="text-lg font-semibold text-ink-950">The LLM is not the database.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-700">
          The catalogue remains structured source data and stays authoritative. The AI layer supplies
          natural-language understanding, retrieval, ranking, summarisation and explanation. Every
          factual claim in the interface traces back to a stored catalogue record, and every record
          links to its original public product page.
        </p>
      </section>

      <Diagram />

      {/* -------------------------------------------------------- principles */}
      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Principle
          title="Structured for facts"
          body="Aircraft applicability, manufacturer, category, part number and lead time are answered by SQL over the ingested schema — not by a language model."
        />
        <Principle
          title="Semantic for meaning"
          body="Free-text requirements are matched against a vector index built from the catalogue's own product documents, so wording need not match Field's terminology."
        />
        <Principle
          title="Evidence for trust"
          body="Each result carries the fields that justify it and the fields the catalogue cannot establish. Gaps are shown, not smoothed over."
        />
      </section>

      {/* ------------------------------------------------------ live figures */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Panel title="Ingestion">
          <Row k="Source" v={meta?.source ?? 'Field International public catalogue'} />
          <Row k="Products stored" v={stats ? stats.products.toLocaleString() : '—'} />
          <Row k="With part number" v={stats ? stats.withPartNumber.toLocaleString() : '—'} />
          <Row k="Detail pages crawled" v={stats ? stats.detailCrawled.toLocaleString() : '—'} />
          <Row k="Published lead times" v={stats ? stats.withLeadTime.toLocaleString() : '—'} />
        </Panel>

        <Panel title="Retrieval">
          <Row k="Structured index" v="SQLite relational schema" />
          <Row k="Full-text index" v="FTS5 + BM25" />
          <Row k="Vector index" v={stats?.embeddingModel ?? 'not built'} />
          <Row k="LLM provider" v={ai.describe} />
          <Row k="Answer grounding" v="Retrieved records only" />
        </Panel>
      </section>

      {/* ------------------------------------------------------ ranking */}
      <section className="mt-6">
        <Panel title="Ranking weights">
          <p className="mb-3 text-xs text-ink-500">
            Configurable and re-normalised across the dimensions a given requirement actually
            constrains. Scores are translated into qualitative classes — never shown as a confidence
            percentage.
          </p>
          <div className="space-y-2">
            {Object.entries(DEFAULT_WEIGHTS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs capitalize text-ink-600">{k}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-signal-500" style={{ width: `${v * 100 / 0.3 * 0.6}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-500">
                  {Math.round(v * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

const NODES: Array<{ label: string; note?: string; branch?: string[] }> = [
  { label: 'Field public catalogue', note: 'WordPress / WooCommerce — sitemaps, REST records, product pages' },
  { label: 'Crawler', note: 'robots-aware, rate-limited, checkpointed, resumable' },
  { label: 'Data normalisation', note: 'merge, derive, deduplicate — absent fields stay null' },
  { label: 'Structured database', note: 'products, taxonomy, images, sources, crawl records' },
  { label: '', branch: ['Full-text search (BM25)', 'Vector index (cosine)'] },
  { label: 'Hybrid retrieval', note: 'structured constraints fused with semantic candidates' },
  { label: 'Requirement parser', note: 'closed-vocabulary entity resolution' },
  { label: 'Ranker', note: 'explicit weights → qualitative match class' },
  { label: 'LLM', note: 'grounded on retrieved records only' },
  { label: 'Grounded response', note: 'no claim beyond the source' },
  { label: 'Source evidence', note: 'every fact cites where it came from' },
  { label: 'Customer action', note: 'compare · request quote' },
];

function Diagram() {
  return (
    <section className="card overflow-hidden p-6">
      <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Pipeline</h2>
      <ol className="mx-auto max-w-xl space-y-0">
        {NODES.map((n, i) => (
          <li key={i}>
            {n.branch ? (
              <div className="grid grid-cols-2 gap-3">
                {n.branch.map((b) => (
                  <div key={b} className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-center text-xs font-medium text-ink-700">
                    {b}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-ink-200 bg-white px-4 py-2.5">
                <div className="text-sm font-medium text-ink-900">{n.label}</div>
                {n.note && <div className="mt-0.5 text-xs text-ink-500">{n.note}</div>}
              </div>
            )}
            {i < NODES.length - 1 && (
              <div className="flex justify-center py-1.5" aria-hidden="true">
                <svg viewBox="0 0 10 18" className="h-4 w-2.5 text-ink-300">
                  <path d="M5 0v13M1.5 9.5 5 13.5l3.5-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{body}</p>
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
