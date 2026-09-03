import Link from 'next/link';
import { catalogueStats } from '@/lib/db/client.ts';
import { demoStats } from '@/lib/db/demo.ts';
import { providerInfo } from '@/lib/ai/provider.ts';
import { DEFAULT_WEIGHTS } from '@/lib/ai/ranking.ts';
import { LEVELS } from '@/lib/levels.ts';

export const dynamic = 'force-dynamic';

export default function ArchitecturePage() {
  let cat = null, demo = null;
  try { cat = catalogueStats(); } catch { /* not ingested */ }
  try { demo = demoStats(); } catch { /* not generated */ }
  const ai = providerInfo();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-light tracking-tight text-ink-950">Architecture</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          How each level is actually built, and how each one extends the last. Written for technical
          stakeholders — the demos themselves require none of this.
        </p>
      </header>

      {/* --------------------------------------------------- headline principle */}
      <section className="mb-10 rounded-[3px] border border-signal-600/25 bg-signal-600/5 p-6">
        <h2 className="text-lg font-medium text-ink-950">AI is not the system of record.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-700">
          The catalogue, the document store and the operational data remain authoritative. AI sits
          on top of them: it supplies natural-language understanding, retrieval, ranking,
          summarisation and explanation. Every claim the interface makes should trace back to a
          record in one of those systems.
        </p>
      </section>

      {/* ------------------------------------------------------ level diagrams */}
      <section className="space-y-6">
        {PIPELINES.map((p, i) => (
          <article key={p.level} className="card p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-[3px] bg-signal-600/10 px-2 py-0.5 text-[11px] font-semibold text-signal-600">
                Level {p.level}
              </span>
              <h3 className="text-base font-medium text-ink-900">{LEVELS[i].title}</h3>
              <Link href={LEVELS[i].href} className="ml-auto text-xs text-signal-600 underline underline-offset-2">
                View demo
              </Link>
            </div>

            <Flow nodes={p.nodes} />

            <p className="mt-4 text-xs leading-relaxed text-ink-600">{p.note}</p>
            {p.newThisLevel && (
              <p className="mt-2 rounded-[3px] bg-ink-50 px-3 py-2 text-xs text-ink-600">
                <span className="font-medium text-ink-800">New at this level: </span>{p.newThisLevel}
              </p>
            )}
          </article>
        ))}
      </section>

      {/* ------------------------------------------------------- live figures */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Panel title="What is running">
          <Row k="Catalogue products (real)" v={cat ? cat.products.toLocaleString() : '—'} />
          <Row k="Detail pages crawled" v={cat ? cat.detailCrawled.toLocaleString() : '—'} />
          <Row k="Synthetic documents" v={demo ? String(demo.documents) : '—'} />
          <Row k="Document chunks indexed" v={demo ? String(demo.chunks) : '—'} />
          <Row k="Structured search" v="SQLite relational schema" />
          <Row k="Full-text search" v="FTS5 + BM25" />
          <Row k="Vector index" v={cat?.embeddingModel ?? 'local TF-IDF'} />
          <Row k="LLM provider" v={ai.describe} />
        </Panel>

        <Panel title="Ranking weights (Level 1)">
          <p className="mb-3 text-xs text-ink-500">
            Explicit and configurable, re-normalised across the dimensions a given requirement
            actually constrains. Translated to a qualitative class, never shown as a percentage.
          </p>
          {Object.entries(DEFAULT_WEIGHTS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 py-1">
              <span className="w-24 shrink-0 text-xs capitalize text-ink-600">{k}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-signal-500" style={{ width: `${(v / 0.3) * 60}%` }} />
              </div>
              <span className="w-9 text-right text-xs tabular-nums text-ink-500">{Math.round(v * 100)}%</span>
            </div>
          ))}
        </Panel>
      </section>

      {/* ------------------------------------------------------- principles */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium text-ink-900">Technical principles</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="card p-4">
              <h3 className="text-sm font-medium text-ink-900">{p.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- trust */}
      <section className="mt-10">
        <h2 className="mb-1 text-lg font-medium text-ink-900">Responsible AI by design</h2>
        <p className="mb-3 max-w-2xl text-sm text-ink-600">
          In a technically sensitive domain, the constraints matter as much as the capability.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {GOVERNANCE.map((g) => (
            <div key={g.title} className="card p-4">
              <h3 className="text-sm font-medium text-ink-900">{g.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">{g.body}</p>
              <p className="mt-2 text-[11px] text-ink-400">
                <span className="font-medium text-ink-500">In this prototype: </span>{g.status}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-[3px] border border-ink-200 bg-white p-5">
        <h2 className="text-sm font-medium text-ink-900">Deployment note</h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          This prototype persists everything in SQLite with FTS5 and a locally-built vector index,
          so it runs with no external services and no network dependency at demo time. The same
          schema and retrieval design map directly onto PostgreSQL with pgvector, which is the
          expected production target; the retrieval interfaces are storage-agnostic, and the
          embedding provider is pluggable for a hosted model.
        </p>
      </section>
    </div>
  );
}

function Flow({ nodes }: { nodes: string[][] }) {
  return (
    <ol className="space-y-1.5">
      {nodes.map((row, i) => (
        <li key={i}>
          <div className={`grid gap-1.5 ${row.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {row.map((n) => (
              <div key={n} className="rounded-[3px] border border-ink-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-ink-700">
                {n}
              </div>
            ))}
          </div>
          {i < nodes.length - 1 && (
            <div className="flex justify-center py-0.5" aria-hidden="true">
              <svg viewBox="0 0 10 14" className="h-3 w-2 text-ink-300">
                <path d="M5 0v10M1.5 7 5 10.5 8.5 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

const PIPELINES = [
  {
    level: 1,
    nodes: [
      ['Field public catalogue'], ['Catalogue ingestion'],
      ['Structured product database', 'Vector index'],
      ['Hybrid retrieval'], ['Ranking'], ['LLM'], ['Grounded answer + evidence'], ['Customer'],
    ],
    note: 'Read-only ingestion of published data. No internal system is touched, which is why this level carries the least risk and can be deployed first.',
    newThisLevel: null as string | null,
  },
  {
    level: 2,
    nodes: [
      ['Internal documents'], ['Ingestion · parsing · chunking'], ['Metadata extraction'],
      ['Structured DB', 'Vector DB'],
      ['Hybrid retrieval + reranking'], ['LLM'], ['Evidence + citations'], ['Employee'],
    ],
    note: 'The same retrieval machinery as Level 1, pointed at internal documents instead of products. Chunking and metadata are added because documents are long and their provenance matters.',
    newThisLevel: 'Chunking, per-document metadata, permissions boundary, citation panel.',
  },
  {
    level: 3,
    nodes: [
      ['Incoming email / RFQ'], ['AI extraction'], ['Workflow engine'],
      ['Catalogue · CRM · supplier data'],
      ['Retrieval + matching'], ['Decision support'], ['Human approval gate'], ['Next workflow step'],
    ],
    note: 'Retrieval is no longer the output — it is an input to a process. The workflow decides what it can settle and what it must escalate, and it cannot progress past the approval gate on its own.',
    newThisLevel: 'Workflow state, line-item matching, exception queue, human approval gates.',
  },
  {
    level: 4,
    nodes: [
      ['Sales · Operations · Technical'],
      ['CRM · ERP / systems · Documents'],
      ['Quotes · Suppliers · Catalogue'],
      ['Unified intelligence layer'], ['Analysis + recommendations'], ['Human decisions'],
    ],
    note: 'Nothing new is invented at this level; it connects what the previous three already produce. The output is advisory — it identifies where time and money are going, and people decide what to do.',
    newThisLevel: 'Cross-system data model, operational metrics, opportunity and ROI modelling.',
  },
];

const PRINCIPLES = [
  { title: 'Structured data for structured facts', body: 'Aircraft applicability, part numbers, categories and lead times are answered by SQL over the ingested schema — not by a language model.' },
  { title: 'RAG for knowledge retrieval', body: 'Free-text questions are answered from retrieved documents, with the retrieved passages carried through to the citation panel.' },
  { title: 'Hybrid, not semantic-only', body: 'Exact identifiers are matched lexically and concepts by vector similarity. Semantic search alone misses part numbers; keyword alone misses meaning.' },
  { title: 'Provider abstraction', body: 'The LLM sits behind an interface with a deterministic implementation and a hosted one. No business logic depends on a specific model or vendor.' },
  { title: 'Workflow engines orchestrate actions', body: 'The AI proposes; the workflow decides what may proceed automatically and what stops for a person.' },
  { title: 'Humans own consequential decisions', body: 'Pricing, delivery commitments, technical suitability and external communication all require human approval by design, not by convention.' },
];

const GOVERNANCE = [
  { title: 'Grounding', body: 'Answers are composed only from retrieved, approved sources. The default generation path builds sentences from retrieved fields, so fabrication is structurally impossible.', status: 'Implemented.' },
  { title: 'Provenance', body: 'Every fact carries the document or catalogue record it came from, and the user can open the underlying source.', status: 'Implemented — citation panel and source links throughout.' },
  { title: 'Uncertainty', body: 'The system states when information is missing, conflicting or out of date rather than resolving it silently.', status: 'Implemented — conflicts, staleness and unmatched items are surfaced.' },
  { title: 'Human oversight', body: 'High-consequence actions require approval. Nothing is sent externally and no commercial commitment is generated.', status: 'Implemented — explicit approval gates in the workflow demo.' },
  { title: 'Permissions', body: 'Users should retrieve only what they are authorised to see; document-level access control and tenant boundaries belong in the retrieval filter.', status: 'Demonstrated in the data model; not enforced in this prototype.' },
  { title: 'Auditability', body: 'Internal AI actions are logged with the query, the sources retrieved, the model used and whether approval was required.', status: 'Implemented as a prototype audit log.' },
  { title: 'Secrets management', body: 'API keys are read from environment variables on the server. No credential is exposed to the browser.', status: 'Implemented.' },
  { title: 'Model isolation', body: 'The provider abstraction allows a self-hosted or region-bound model without touching retrieval or business logic.', status: 'Implemented at the interface level.' },
];

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
