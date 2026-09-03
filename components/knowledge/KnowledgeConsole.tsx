'use client';

import { useState } from 'react';
import { AIBadge } from '@/components/ui/primitives.tsx';

const WORKFLOWS = [
  { label: 'Analyse an enquiry', q: "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx thrust reverser tooling. Tell me everything I need to know before I respond." },
  { label: 'Find previous work', q: 'Have we dealt with anything similar to Singapore Aero MRO 787 thrust reverser tooling before?' },
  { label: 'Prepare a quote', q: 'Build me a quote preparation brief for the Singapore Aero MRO 787 GEnx enquiry.' },
  { label: 'Ask the company', q: 'How do we normally handle an RFQ where the customer needs delivery faster than our standard lead time?' },
];

interface Citation {
  documentId: string; title: string; path: string; documentType: string;
  updatedAt: string; excerpt: string; staleMonths?: number | null;
}
interface Field {
  label: string; value: string; interpretation?: boolean; citations: Citation[];
  conflict?: { summary: string; positions: Array<{ value: string; citation: Citation }> };
  ageWarning?: string;
}
interface Brief {
  customerName: string | null; requirement: string | null; fields: Field[];
  openQuestions: string[]; recommendedNextStep: string;
  retrieval: { trace: { steps: Array<{ label: string; detail: string }>; durationMs: number }; documents: any[] };
}

export function KnowledgeConsole() {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [generated, setGenerated] = useState<{ kind: string; text: string } | null>(null);
  const [panel, setPanel] = useState<Citation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string, action?: string) => {
    if (!q.trim()) return;
    setBusy(true); setError(null);
    if (!action) { setGenerated(null); setBrief(null); }
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed.');
      setBrief(data.brief); setMatches(data.matches ?? []);
      if (data.generated) setGenerated(data.generated);
      setQuestion(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="relative">
      {/* ------------------------------------------------------------ input */}
      <div className="card p-5">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          What do you need to know?
        </label>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(question); }}
            placeholder="Ask about a customer, an enquiry, or how we do something…"
            className="flex-1 rounded-[3px] border border-ink-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal-500 focus:ring-4 focus:ring-signal-600/10"
          />
          <button
            onClick={() => ask(question)}
            disabled={busy || !question.trim()}
            className="shrink-0 rounded-[3px] bg-action-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action-500 disabled:opacity-40"
          >
            {busy ? 'Searching…' : 'Ask'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WORKFLOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => ask(w.q)}
              disabled={busy}
              className="rounded-[3px] border border-ink-200 px-2.5 py-1 text-[11px] text-signal-600 transition hover:border-signal-300 hover:bg-ink-50 disabled:opacity-40"
            >
              {w.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-action-600">{error}</p>}
      </div>

      {brief && (
        <div className="mt-6 space-y-6">
          {/* ------------------------------------------------ retrieval trace */}
          <details className="card p-4">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Retrieval trace — {brief.retrieval.documents.length} documents in {brief.retrieval.trace.durationMs}ms
            </summary>
            <ul className="mt-3 space-y-1.5">
              {brief.retrieval.trace.steps.map((s, i) => (
                <li key={i} className="text-xs text-ink-600">
                  <span className="font-medium text-ink-800">{s.label}</span> — {s.detail}
                </li>
              ))}
            </ul>
          </details>

          {/* ------------------------------------------------------- the brief */}
          <section>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-medium text-ink-900">Enquiry Intelligence</h2>
              <AIBadge provider="local-grounded" />
            </div>

            <div className="divide-y divide-ink-100 rounded-[3px] border border-ink-100 bg-white">
              {brief.fields.map((f) => (
                <div key={f.label} className="p-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      {f.label}
                    </span>
                    {f.interpretation && (
                      <span className="rounded-[3px] bg-signal-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-signal-600">
                        AI interpretation
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-800">{f.value}</p>

                  {f.conflict && (
                    <div className="mt-2 rounded-[3px] border border-[color:var(--color-caution-600)]/30 bg-[color:var(--color-caution-600)]/8 p-3">
                      <p className="text-xs font-semibold text-[color:var(--color-caution-600)]">
                        Conflicting information found
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-700">{f.conflict.summary}</p>
                      <ul className="mt-2 space-y-1">
                        {f.conflict.positions.map((p, i) => (
                          <li key={i} className="mono text-[11px] text-ink-600">• {p.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {f.ageWarning && (
                    <p className="mt-2 text-xs text-[color:var(--color-caution-600)]">⚠ {f.ageWarning}</p>
                  )}

                  {f.citations.length > 0 && (
                    <button
                      onClick={() => setPanel(f.citations)}
                      className="mt-2 text-xs font-medium text-signal-600 underline underline-offset-2 hover:text-action-600"
                    >
                      {f.citations.length} source{f.citations.length === 1 ? '' : 's'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------- real catalogue matches */}
          {matches.length > 0 && (
            <section className="card p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Relevant catalogue items — real Field data
              </h3>
              <ul className="mt-3 divide-y divide-ink-100">
                {matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                    <a href={`/product/${m.id}`} className="mono text-xs font-semibold text-signal-600 hover:underline">
                      {m.partNumber ?? m.id}
                    </a>
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-600">{m.name}</span>
                    <span className="text-[11px] text-ink-400">
                      {m.leadTimeDays !== null ? `${m.leadTimeDays} days` : 'lead time not published'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ------------------------------------------------- open questions */}
          <section className="card p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Open questions
            </h3>
            <ul className="mt-2 space-y-1.5">
              {brief.openQuestions.map((q) => (
                <li key={q} className="text-sm text-ink-700">• {q}</li>
              ))}
            </ul>
            <p className="mt-3 border-t border-ink-100 pt-3 text-sm text-ink-700">
              <span className="font-medium">Recommended next step: </span>
              {brief.recommendedNextStep}
            </p>
          </section>

          {/* ------------------------------------------------------- actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => ask(question, 'respond')} disabled={busy}
              className="rounded-[3px] bg-action-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-action-500 disabled:opacity-40">
              Prepare my response
            </button>
            <button onClick={() => ask(question, 'quote-brief')} disabled={busy}
              className="rounded-[3px] border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-signal-600 transition hover:bg-ink-50 disabled:opacity-40">
              Prepare quote brief
            </button>
            <button onClick={() => setPanel(brief.retrieval.documents.map(docToCitation))}
              className="rounded-[3px] border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-signal-600 transition hover:bg-ink-50">
              Show source documents
            </button>
          </div>

          {generated && <GeneratedOutput generated={generated} />}
        </div>
      )}

      {panel && <SourcePanel citations={panel} onClose={() => setPanel(null)} />}
    </div>
  );
}

function docToCitation(d: any): Citation {
  return {
    documentId: d.document_id, title: d.title, path: d.path,
    documentType: d.document_type, updatedAt: d.updated_at,
    excerpt: String(d.body ?? '').split('\n').filter(Boolean).slice(1, 4).join(' ').slice(0, 240),
    staleMonths: d.stale_months,
  };
}

function GeneratedOutput({ generated }: { generated: { kind: string; text: string } }) {
  const [copied, setCopied] = useState(false);
  const isResponse = generated.kind === 'response';
  return (
    <section className="rounded-[3px] border border-signal-600/25 bg-signal-600/5 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-ink-900">
          {isResponse ? 'Draft customer response' : 'Quote preparation brief'}
        </h3>
        <AIBadge provider="local-grounded" />
        <button
          onClick={() => { navigator.clipboard?.writeText(generated.text); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
          className="ml-auto rounded-[3px] border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-signal-600 hover:bg-ink-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="mono max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-[3px] bg-white p-4 text-xs leading-relaxed text-ink-800">
        {generated.text}
      </pre>
      {isResponse && (
        <p className="mt-3 border-t border-signal-600/15 pt-3 text-xs text-[color:var(--color-caution-600)]">
          ⚠ Draft only. Nothing is sent. This response commits to no price, no delivery date and no
          statement of technical suitability — those require human approval.
        </p>
      )}
    </section>
  );
}

function SourcePanel({ citations, onClose }: { citations: Citation[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/25" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-ink-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-900">
            Source documents ({citations.length})
          </h3>
          <button onClick={onClose} className="rounded-[3px] px-2 py-1 text-sm text-ink-400 hover:bg-ink-50">
            Close
          </button>
        </div>
        <ul className="space-y-3">
          {citations.map((c) => (
            <li key={c.documentId} className="rounded-[3px] border border-ink-100 p-3">
              <p className="text-sm font-medium text-ink-900">{c.title}</p>
              <p className="mono mt-0.5 text-[11px] text-signal-600">{c.path}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-ink-400">
                <span>{c.documentType}</span>
                <span>updated {c.updatedAt.slice(0, 10)}</span>
                {c.staleMonths ? (
                  <span className="text-[color:var(--color-caution-600)]">
                    superseded · ~{c.staleMonths} months old
                  </span>
                ) : null}
              </div>
              {c.excerpt && (
                <p className="mt-2 border-l-2 border-ink-200 pl-2 text-xs leading-relaxed text-ink-600">
                  {c.excerpt}…
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] leading-relaxed text-ink-400">
          Synthetic demonstration documents. Not real Field International records.
        </p>
      </aside>
    </div>
  );
}
