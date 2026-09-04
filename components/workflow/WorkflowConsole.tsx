'use client';

import { useEffect, useState } from 'react';
import { AIBadge } from '@/components/ui/primitives.tsx';

const STAGE_ORDER = ['read', 'extract', 'classify', 'match', 'history', 'exceptions', 'package'];

export function WorkflowConsole({
  reference = 'RFQ-10482',
  beat,
}: {
  reference?: string;
  /** Closing commentary, revealed only once processing completes. */
  beat?: React.ReactNode;
}) {
  const [pkg, setPkg] = useState<any>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'exceptions' | 'matched' | 'package'>('exceptions');

  const run = async () => {
    setRunning(true); setError(null); setPkg(null); setStageIndex(0);
    try {
      // The processing is real; the staged reveal only paces what actually happened.
      const res = await fetch('/api/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Workflow failed.');
      setPkg(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workflow failed.');
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!pkg) return;
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setStageIndex(i);
      if (i >= STAGE_ORDER.length) { clearInterval(t); setRunning(false); }
    }, 320);
    return () => clearInterval(t);
  }, [pkg]);

  const done = pkg && !running;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- incoming email */}
      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 bg-ink-50 px-4 py-2">
          <span className="label">
            Incoming enquiry
          </span>
        </div>
        <div className="p-4">
          <dl className="mono space-y-0.5 text-xs text-ink-600">
            <div><span className="text-ink-400">From: </span>procurement@singaporeaeromro.example</div>
            <div><span className="text-ink-400">Subject: </span>RFQ — Boeing 787 GEnx tooling</div>
            <div><span className="text-ink-400">Attachment: </span>{reference}.pdf (17 line items)</div>
          </dl>
          <p className="mt-3 border-l-2 border-ink-200 pl-3 text-sm leading-relaxed text-ink-700">
            We are preparing a heavy maintenance programme and require pricing and availability for
            the attached tooling requirements. Our maintenance slot opens in ten weeks and we cannot
            hold the aircraft beyond that window.
          </p>
          <button
            onClick={run}
            disabled={running}
            className="mt-4 rounded-[2px] bg-action-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-40"
          >
            {running ? 'Processing…' : pkg ? 'Run again' : 'Process this RFQ'}
          </button>
          {error && <p className="mt-2 text-xs text-action-600">{error}</p>}
        </div>
      </section>

      {/* --------------------------------------------------------- pipeline */}
      {pkg && (
        <section className="card p-4">
          <h2 className="mb-3 label">
            Processing pipeline
          </h2>
          <ol className="space-y-2">
            {pkg.stages.map((s: any, i: number) => {
              const state = i < stageIndex ? 'done' : i === stageIndex ? 'active' : 'pending';
              return (
                <li key={s.key} className="flex items-start gap-2.5">
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                    state === 'done' ? 'bg-[color:var(--color-strong-600)] text-white'
                    : state === 'active' ? 'bg-signal-600 text-white'
                    : 'bg-ink-100 text-ink-400'}`}>
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  <div className={state === 'pending' ? 'opacity-35' : ''}>
                    <span className="text-sm font-medium text-ink-800">{s.label}</span>
                    <span className="text-sm text-ink-500"> — {s.detail}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 border-t border-ink-100 pt-2 text-[11px] text-ink-400">
            Real processing against the live catalogue — {pkg.durationMs}ms. The staged reveal paces
            what actually happened; it does not simulate it.
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- extraction */}
      {done && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric value={pkg.counts.total} label="Requirements identified" tone="neutral" />
            <Metric value={pkg.counts.matched} label="Catalogue matches" tone="good" />
            <Metric value={pkg.counts.review + pkg.counts.unmatched} label="Require human review" tone="caution" />
          </section>

          <section className="card p-4">
            <h2 className="mb-3 label">
              Extracted from the enquiry
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Row k="Customer" v={pkg.extracted.customerName} />
              <Row k="Aircraft" v={pkg.extracted.aircraft} />
              <Row k="Engine" v={pkg.extracted.engine ?? 'Not stated'} />
              <Row k="Programme" v={pkg.extracted.programme} />
              <Row k="Required delivery" v={`${pkg.extracted.requiredDeliveryWeeks} weeks`} />
              <Row k="Account owner" v={pkg.extracted.ownerName} />
            </dl>
          </section>

          {/* ------------------------------------------------------- tabs */}
          <div className="flex gap-1.5">
            {([
              ['exceptions', `Human review (${pkg.counts.review + pkg.counts.unmatched})`],
              ['matched', `Matched (${pkg.counts.matched})`],
              ['package', 'Work package'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-[2px] px-3 py-1.5 text-sm font-medium transition ${
                  tab === key ? 'bg-signal-600 text-white' : 'border border-ink-200 bg-white text-signal-600 hover:bg-ink-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'exceptions' && <Exceptions pkg={pkg} />}
          {tab === 'matched' && <Matched pkg={pkg} />}
          {tab === 'package' && <Package pkg={pkg} />}
          {beat}
        </>
      )}
    </div>
  );
}

function Metric({ value, label, tone }: { value: number; label: string; tone: 'neutral' | 'good' | 'caution' }) {
  const colour = {
    neutral: 'text-ink-900', good: 'text-[color:var(--color-strong-600)]',
    caution: 'text-[color:var(--color-caution-600)]',
  }[tone];
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold figure ${colour}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="label">{k}</dt>
      <dd className="mt-0.5 text-sm text-ink-800">{v}</dd>
    </div>
  );
}

function Exceptions({ pkg }: { pkg: any }) {
  const flagged = pkg.lines.filter((l: any) => l.status !== 'matched');
  return (
    <section className="space-y-3">
      <div className="rounded-[2px] border border-[color:var(--color-caution-600)]/30 bg-[color:var(--color-caution-600)]/8 p-4">
        <h2 className="text-sm font-semibold text-[color:var(--color-caution-600)]">
          {flagged.length} items require human attention
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-700">
          The AI does not resolve these. Each one is a judgement the catalogue cannot settle, so it
          is routed to a person rather than guessed.
        </p>
      </div>

      {flagged.map((l: any) => (
        <article key={l.line} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono text-xs font-semibold text-ink-500">
              Item {String(l.line).padStart(2, '0')}
            </span>
            <span className={`rounded-[2px] px-2 py-0.5 text-[11px] font-semibold ${
              l.status === 'unmatched'
                ? 'bg-action-600/10 text-action-600'
                : 'bg-[color:var(--color-caution-600)]/12 text-[color:var(--color-caution-600)]'
            }`}>
              {l.status === 'unmatched' ? 'No confirmed match' : 'Review required'}
            </span>
            <span className="mono text-xs text-signal-600">{l.requestedPart ?? '—'}</span>
          </div>
          <p className="mt-1.5 text-sm text-ink-800">{l.description}</p>
          <p className="mt-2 text-xs leading-relaxed text-[color:var(--color-caution-600)]">
            {l.reviewReason}
          </p>
          {l.product && (
            <p className="mono mt-2 rounded-[2px] bg-ink-50 px-2 py-1 text-[11px] text-ink-600">
              Closest catalogue record: {l.product.partNumber} — {l.product.name.slice(0, 60)}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}

function Matched({ pkg }: { pkg: any }) {
  const matched = pkg.lines.filter((l: any) => l.status === 'matched');
  return (
    <section className="card overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50 text-left text-[11px] uppercase tracking-wider text-ink-400">
            <th className="p-2.5 font-semibold">Item</th>
            <th className="p-2.5 font-semibold">Requested</th>
            <th className="p-2.5 font-semibold">Catalogue record</th>
            <th className="p-2.5 font-semibold">Lead time</th>
            <th className="p-2.5 font-semibold">Previously supplied</th>
          </tr>
        </thead>
        <tbody>
          {matched.map((l: any) => (
            <tr key={l.line} className="border-b border-ink-100 last:border-0">
              <td className="mono p-2.5 text-xs text-ink-400">{String(l.line).padStart(2, '0')}</td>
              <td className="mono p-2.5 text-xs text-signal-600">{l.requestedPart}</td>
              <td className="p-2.5 text-xs text-ink-700">{l.product?.name.slice(0, 58)}</td>
              <td className={`p-2.5 text-xs ${l.leadTimeDays === null ? 'italic text-ink-400' : 'text-ink-700'}`}>
                {l.leadTimeDays !== null ? `${l.leadTimeDays} days` : 'not published'}
              </td>
              <td className="p-2.5 text-xs text-ink-600">{l.previouslySupplied ? `Yes (${l.previousQuoteRef ?? '—'})` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Package({ pkg }: { pkg: any }) {
  return (
    <section className="space-y-4">
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-medium text-ink-900">RFQ Preparation Package</h2>
          <AIBadge provider="deterministic-matcher" />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row k="Customer" v={pkg.extracted.customerName} />
          <Row k="Opportunity" v={`${pkg.extracted.aircraft} ${pkg.extracted.engine ?? ''} tooling`} />
          <Row k="Requested items" v={String(pkg.counts.total)} />
          <Row k="Catalogue matches" v={String(pkg.counts.matched)} />
          <Row k="Technical review" v={String(pkg.counts.review + pkg.counts.unmatched)} />
          <Row k="Historical precedent" v={`${pkg.history.priorRfqs} previous enquiries`} />
          <Row k="Pricing precedent" v={pkg.history.lastQuoteValueGbp ? `£${Number(pkg.history.lastQuoteValueGbp).toLocaleString()} (previous quote)` : 'None on record'} />
          <Row k="Supplier follow-up" v={`${pkg.supplierFollowUps} items`} />
        </dl>
        <p className="mt-4 border-t border-ink-100 pt-3 text-sm text-ink-700">
          <span className="font-medium">Recommended next action: </span>{pkg.recommendedAction}
        </p>
      </div>

      <div className="rounded-[2px] border border-signal-600/25 bg-signal-600/5 p-5">
        <h3 className="text-sm font-medium text-ink-900">Where humans remain responsible</h3>
        <p className="mt-1 text-xs text-ink-600">
          AI automates the routine work. Humans make the consequential decisions.
        </p>
        <ul className="mt-3 space-y-1.5">
          {pkg.humanGates.map((g: string) => (
            <li key={g} className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-action-600" />
              {g}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
