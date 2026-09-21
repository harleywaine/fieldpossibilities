'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  STEPS, stepIndex, formatMinutes, simulatedLeadDays, type StepId, type StepMetric,
} from '@/lib/journey.ts';
import type { SimRfq, SimLine, SimCustomer } from '@/lib/simulation/rfq.ts';
import {
  RequestStage, RfqStage, ResearchStage, CheckStage, ReviewStage, SupplierStage,
  ApprovalStage, ManufactureStage, type Decision,
} from '@/components/journey/sim-stages.tsx';

interface SimState {
  request: string;
  customerId: string;
  rfq: SimRfq | null;
  brief: any | null;
  review: Record<number, Decision>;
  supplierSent: boolean;
  approval: 'approved' | 'returned' | null;
  risk: string | null;
}

const STORE = 'field-simulation-v1';
const EMPTY = (customerId: string): SimState => ({
  request: '', customerId, rfq: null, brief: null, review: {},
  supplierSent: false, approval: null, risk: null,
});

/**
 * The viewer's own enquiry, followed through Field. They type the request; the
 * system builds the RFQ from the real catalogue; every later step works on
 * that RFQ. Human steps halt until the viewer decides, and the rail will not
 * let them skip past an undecided one. State survives reloads (session only),
 * and every step has its own URL.
 */
export function Journey({
  metrics, customers,
}: { metrics: Record<string, StepMetric>; customers: SimCustomer[] }) {
  const params = useSearchParams();
  const defaultCustomer = customers[0]?.id ?? '';
  const [sim, setSim] = useState<SimState>(() => EMPTY(defaultCustomer));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ------------------------------------------------------------ persistence
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) setSim({ ...EMPTY(defaultCustomer), ...JSON.parse(raw) });
    } catch { /* storage unavailable — start fresh */ }
    setLoaded(true);
  }, [defaultCustomer]);

  useEffect(() => {
    if (!loaded) return;
    try { sessionStorage.setItem(STORE, JSON.stringify(sim)); } catch { /* ignore */ }
  }, [sim, loaded]);

  const patch = (p: Partial<SimState>) => setSim((s) => ({ ...s, ...p }));

  // --------------------------------------------------------------- derived
  const rfq = sim.rfq;
  const reviewLines = rfq?.lines.filter((l) => l.flags.some((f) => f.kind === 'review')) ?? [];
  const reviewDone = reviewLines.every((l) => sim.review[l.line]);
  const included = rfq?.lines.filter((l) => {
    const d = sim.review[l.line];
    return !d || d === 'approve';
  }) ?? [];
  const held = rfq?.lines.filter((l) => sim.review[l.line] && sim.review[l.line] !== 'approve') ?? [];
  const supplierLines = included.filter((l) => l.flags.some((f) => f.kind === 'supplier'));
  const supplierDone = supplierLines.length === 0 || sim.supplierSent;

  const leadDays = useCallback((l: SimLine) => {
    const needsSupplier = l.flags.some((f) => f.kind === 'supplier');
    return needsSupplier ? simulatedLeadDays(l.partNumber, l.leadTimeDays) : (l.leadTimeDays ?? 0);
  }, []);
  const replies = Object.fromEntries(supplierLines.map((l) => [l.line, simulatedLeadDays(l.partNumber, l.leadTimeDays)]));
  const deliveryDays = included.length ? Math.max(...included.map(leadDays)) : null;
  const lateCount = included.filter((l) => rfq?.deadlineDays != null && leadDays(l) > rfq.deadlineDays).length;
  const riskDone = lateCount === 0 || Boolean(sim.risk);

  /** The furthest step the viewer may reach — they can't jump past a decision. */
  const reachable = useMemo(() => {
    if (!rfq || !rfq.lines.length) return stepIndex('request');
    if (!reviewDone) return stepIndex('review');
    if (!supplierDone) return stepIndex('supplier');
    if (sim.approval !== 'approved') return stepIndex('approval');
    if (!riskDone) return stepIndex('manufacture');
    return STEPS.length - 1;
  }, [rfq, reviewDone, supplierDone, sim.approval, riskDone]);

  const raw = Number(params.get('s') ?? 0);
  const requested = Number.isFinite(raw) ? Math.max(0, Math.min(STEPS.length - 1, Math.floor(raw))) : 0;
  const index = loaded ? Math.min(requested, reachable) : Math.min(requested, 1);
  const step = STEPS[index];

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(reachable, i));
    if (next === index) return;
    window.history.pushState(null, '', next === 0 ? '?' : `?s=${next}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [reachable, index]);

  // A deep link beyond what's been decided lands on the step that's waiting.
  useEffect(() => {
    if (loaded && requested > reachable) {
      window.history.replaceState(null, '', reachable === 0 ? '?' : `?s=${reachable}`);
    }
  }, [loaded, requested, reachable]);

  // ---------------------------------------------------------------- actions
  const submit = async () => {
    const q = sim.request.trim();
    if (q.length < 3 || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/simulate/rfq', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, customerId: sim.customerId }),
      });
      const data: SimRfq & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not build the quote request.');
      if (!data.lines.length) throw new Error('Nothing in the catalogue matched that. Try describing the aircraft or the job.');
      // A new request resets everything downstream.
      setSim((s) => ({ ...s, rfq: data, brief: null, review: {}, supplierSent: false, approval: null, risk: null }));
      window.history.pushState(null, '', `?s=${stepIndex('rfq')}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Research runs in the background so it's ready when reached.
      const about = [data.aircraft, data.engine, 'tooling'].filter(Boolean).join(' ');
      fetch('/api/knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `I've received an enquiry from ${data.customer.name} for ${about}. Tell me everything I need to know before I respond.` }),
      }).then((r) => r.json()).then((d) => patch({ brief: d.brief ?? null })).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the quote request.');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setSim(EMPTY(defaultCustomer));
    go(0);
  };

  // ---------------------------------------------------------------- ledger
  const ledger = useMemo(() => {
    const rows = STEPS.map((s, i) => ({ s, i, m: s.metric ? metrics[s.metric] : undefined }))
      .filter((r): r is { s: (typeof STEPS)[number]; i: number; m: StepMetric } => Boolean(r.m));
    const totalBefore = rows.reduce((a, r) => a + r.m.before, 0);
    const totalAfter = rows.reduce((a, r) => a + r.m.after, 0);
    const done = rows.filter((r) => r.i <= index);
    return {
      totalBefore, totalAfter,
      before: done.reduce((a, r) => a + r.m.before, 0),
      after: done.reduce((a, r) => a + r.m.after, 0),
      latest: done[done.length - 1] ?? null,
    };
  }, [metrics, index]);

  // -------------------------------------------------------------- screens
  const decisions = Object.keys(sim.review).length + (sim.supplierSent ? 1 : 0)
    + (sim.approval === 'approved' ? 1 : 0) + (sim.risk ? 1 : 0);

  const screens: Record<StepId, { lines: React.ReactNode[]; stage?: React.ReactNode; blocked?: string; cta?: string }> = {
    start: {
      lines: [
        'Play the part of Field’s customer.',
        'Type a request, and follow it through quotation, review, suppliers and manufacture — deciding what a person would decide along the way.',
      ],
      stage: (
        <p className="text-[12.5px] leading-relaxed text-ink-400">
          The catalogue is Field’s real, published one. The customer, their history, supplier
          replies and manufacturing are synthetic or simulated, and labelled as such. Steps marked
          with a ring on the rail above will stop and ask you to decide.
        </p>
      ),
      cta: 'Begin',
    },
    request: {
      lines: ['What does the customer need?', 'Write it the way an engineer would — no part numbers required.'],
      stage: (
        <RequestStage
          value={sim.request}
          onChange={(v) => patch({ request: v })}
          customers={customers}
          customerId={sim.customerId}
          onCustomer={(id) => patch({ customerId: id })}
          onSubmit={submit}
          busy={busy}
          error={error}
        />
      ),
      cta: rfq ? 'Continue with the last request' : undefined,
      blocked: rfq ? undefined : 'Send a request to continue',
    },
    rfq: {
      lines: ['Here is the quote request it became.', 'Real parts from Field’s catalogue, and the reasoning behind each one.'],
      stage: rfq && <RfqStage rfq={rfq} />,
    },
    research: {
      lines: [`Before replying, it reads what Field already knows about ${rfq?.customer.name ?? 'this customer'}.`],
      stage: <ResearchStage brief={sim.brief} />,
    },
    check: {
      lines: ['Every line is checked against what the catalogue actually establishes.', 'Anything it can’t confirm is sent to a person — never guessed.'],
      stage: rfq && <CheckStage rfq={rfq} />,
    },
    review: {
      lines: [reviewLines.length ? 'An engineer’s judgement is needed.' : 'No engineer needed this time.'],
      stage: <ReviewStage lines={reviewLines} decisions={sim.review} onDecide={(line, d) => setSim((s) => ({ ...s, review: { ...s.review, [line]: d } }))} />,
      blocked: reviewDone ? undefined : 'Decide on every flagged line to continue',
    },
    supplier: {
      lines: [supplierLines.length ? 'Some lead times need confirming before a date is promised.' : 'Every lead time is already known.'],
      stage: (
        <SupplierStage
          lines={supplierLines}
          sent={sim.supplierSent}
          onSend={() => patch({ supplierSent: true })}
          replies={replies}
          deadlineDays={rfq?.deadlineDays ?? null}
        />
      ),
      blocked: supplierDone ? undefined : 'Approve the supplier enquiries to continue',
    },
    approval: {
      lines: ['The quote is ready for sign-off.'],
      stage: rfq && (
        <ApprovalStage
          rfq={rfq}
          included={included}
          held={held}
          leadDays={leadDays}
          deliveryDays={deliveryDays}
          decision={sim.approval}
          onDecide={(d) => {
            patch({ approval: d });
            if (d === 'returned') go(stepIndex('review'));
          }}
        />
      ),
      blocked: sim.approval === 'approved' ? undefined : 'Approve the quote to continue',
    },
    manufacture: {
      lines: ['The customer accepts. The order goes to manufacture.', lateCount ? 'One thing needs you before it does.' : 'The system watches every line until it ships.'],
      stage: (
        <ManufactureStage
          included={included}
          leadDays={leadDays}
          deadlineDays={rfq?.deadlineDays ?? null}
          decision={sim.risk}
          onDecide={(d) => patch({ risk: d })}
        />
      ),
      blocked: riskDone ? undefined : 'Decide how to handle the late items to continue',
    },
    summary: {
      lines: ['One enquiry, start to finish.'],
      stage: (
        <Summary
          before={ledger.totalBefore}
          after={ledger.totalAfter}
          volume={metrics['RFQ preparation']?.volume ?? 1900}
          decisions={decisions}
          rfq={rfq}
          brief={sim.brief}
          onRestart={restart}
        />
      ),
    },
  };

  const c = screens[step.id];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* --------------------------------------------------------------- top */}
      <header className="mx-auto flex w-full max-w-4xl items-center gap-6 px-6 pt-6 sm:px-10">
        <button onClick={() => go(0)} className="flex items-center gap-2" aria-label="Back to the start">
          <span className="h-2 w-2 rotate-45 bg-signal-700" />
          <span className="text-[12px] font-medium tracking-tight text-ink-800">Field</span>
        </button>
        {rfq && (
          <button onClick={restart} className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600">
            New request
          </button>
        )}
        <Link href="/demos" className={`${rfq ? '' : 'ml-auto'} text-[11px] text-ink-400 transition-colors hover:text-signal-600`}>
          All demos
        </Link>
      </header>

      {/* -------------------------------------------------------------- rail */}
      <nav aria-label="Journey" className="mx-auto mt-8 w-full max-w-4xl px-6 sm:px-10">
        <ol className="flex items-center">
          {STEPS.map((s, i) => {
            const locked = i > reachable;
            return (
              <li key={s.id} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                {i > 0 && <span className={`h-px flex-1 ${i <= index ? 'bg-signal-600' : 'bg-ink-100'}`} />}
                <button
                  onClick={() => !locked && go(i)}
                  disabled={locked}
                  title={locked ? `${s.rail} — not reached yet` : s.rail}
                  aria-current={i === index ? 'step' : undefined}
                  className="group relative grid h-5 w-5 shrink-0 place-items-center disabled:cursor-default"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      i === index ? 'h-2.5 w-2.5 bg-signal-700'
                      : i < index ? 'h-1.5 w-1.5 bg-signal-600'
                      : 'h-1.5 w-1.5 bg-ink-200'
                    } ${s.human ? 'ring-2 ring-[color:var(--color-caution-500)] ring-offset-2' : ''}`}
                  />
                  <span
                    className={`pointer-events-none absolute top-6 whitespace-nowrap text-[10.5px] transition-opacity ${
                      i === index ? 'text-ink-800 opacity-100' : 'text-ink-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {s.rail}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ screen */}
      <main key={step.id} className="mx-auto w-full max-w-2xl flex-1 px-6 pb-48 pt-[9vh] sm:px-10">
        {step.data && <DataTag kind={step.data} />}

        <div className="space-y-4">
          {c.lines.map((line, i) => (
            <p
              key={i}
              className={`step-in font-light leading-[1.25] ${i === 0 ? 'text-[28px] text-ink-950 sm:text-[34px]' : 'text-[19px] text-ink-500 sm:text-[22px]'}`}
              style={{ animationDelay: `${120 + i * 380}ms` }}
            >
              {line}
            </p>
          ))}
        </div>

        {c.stage && (
          <div className="step-in mt-12" style={{ animationDelay: `${280 + c.lines.length * 380}ms` }}>
            {c.stage}
          </div>
        )}

        {!isLast && (step.id !== 'request' || rfq) && (
          <div className="step-in mt-12 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ animationDelay: `${450 + c.lines.length * 380}ms` }}>
            <button
              onClick={() => go(index + 1)}
              disabled={Boolean(c.blocked)}
              className="rounded-[2px] bg-action-600 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-action-500 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
            >
              {c.cta ?? 'Continue'} →
            </button>
            {c.blocked && <span className="text-[12px] text-[color:var(--color-caution-600)]">{c.blocked}</span>}
            {index > 0 && !c.blocked && (
              <button onClick={() => go(index - 1)} className="text-[12.5px] text-ink-400 transition-colors hover:text-signal-600">
                ← Back
              </button>
            )}
          </div>
        )}
      </main>

      {index > 1 && !isLast && <Ledger ledger={ledger} />}
    </div>
  );
}

function DataTag({ kind }: { kind: 'real' | 'synthetic' | 'mixed' | 'simulated' }) {
  const t = {
    real: { text: 'Real Field catalogue', cls: 'text-[color:var(--color-strong-600)]' },
    synthetic: { text: 'Synthetic records', cls: 'text-[color:var(--color-caution-600)]' },
    mixed: { text: 'Real catalogue · synthetic customer', cls: 'text-signal-600' },
    simulated: { text: 'Simulated', cls: 'text-[color:var(--color-caution-600)]' },
  }[kind];
  return <p className={`step-in mono mb-6 text-[10.5px] uppercase tracking-[0.12em] ${t.cls}`}>{t.text}</p>;
}

/* ------------------------------------------------------------------ ledger */

function Ledger({ ledger }: { ledger: { totalBefore: number; before: number; after: number; latest: any } }) {
  const scale = (m: number) => `${(m / ledger.totalBefore) * 100}%`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl px-6 py-4 sm:px-10">
        <div className="mb-2.5 flex items-baseline justify-between gap-4">
          <p className="mono text-[10px] tracking-[0.12em] text-ink-400">PEOPLE’S TIME ON THIS ENQUIRY</p>
          {ledger.latest && (
            <p key={ledger.latest.s.id} className="step-in mono hidden text-[10.5px] text-ink-500 sm:block">
              + {ledger.latest.s.ledgerLabel}: {ledger.latest.m.before} → {ledger.latest.m.after} min
            </p>
          )}
        </div>
        <Row label="Today" value={formatMinutes(ledger.before)} width={scale(ledger.before)} colour="bg-ink-300" />
        <Row label="With AI" value={formatMinutes(ledger.after)} width={scale(ledger.after)} colour="bg-signal-600" />
      </div>
    </div>
  );
}

function Row({ label, value, width, colour }: { label: string; value: string; width: string; colour: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="w-14 shrink-0 text-[11px] text-ink-500">{label}</span>
      <div className="h-1.5 flex-1 bg-ink-50">
        <div className={`h-full ${colour} transition-[width] duration-700 ease-out`} style={{ width }} />
      </div>
      <span className="mono w-20 shrink-0 text-right text-[12px] text-ink-800">{value}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- summary */

function Summary({
  before, after, volume, decisions, rfq, brief, onRestart,
}: {
  before: number; after: number; volume: number; decisions: number;
  rfq: SimRfq | null; brief: any | null; onRestart: () => void;
}) {
  const hoursPerYear = Math.round(((before - after) * volume) / 60);
  const checks = rfq ? rfq.lines.length * 4 : 0;
  const docs = brief?.retrieval?.documents?.length ?? 0;
  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200">
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-ink-400">PEOPLE’S TIME TODAY</p>
          <p className="mt-2 text-[30px] font-light text-ink-400">{formatMinutes(before)}</p>
        </div>
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-signal-600">WITH AI</p>
          <p className="mt-2 text-[30px] font-light text-ink-950">{formatMinutes(after)}</p>
        </div>
      </div>

      {rfq && (
        <p className="step-in mt-8 text-[17px] font-light leading-relaxed text-ink-700" style={{ animationDelay: '300ms' }}>
          The system searched {rfq.considered.toLocaleString()} relevant catalogue records, read {docs} internal
          documents and ran {checks} checks. <span className="text-ink-950">You made {decisions} decisions.</span>{' '}
          That division of labour is the point.
        </p>
      )}

      <p className="step-in mt-6 text-[15px] font-light leading-snug text-ink-600" style={{ animationDelay: '500ms' }}>
        Across {volume.toLocaleString()} enquiries a year, that is roughly {hoursPerYear.toLocaleString()} hours of people’s time given back.
      </p>
      <p className="step-in mt-2 text-[12px] leading-relaxed text-ink-400" style={{ animationDelay: '600ms' }}>
        Illustrative. Times and volumes are demonstration assumptions, not Field measurements — every one is adjustable in{' '}
        <Link href="/roi" className="underline decoration-dotted underline-offset-[3px] hover:text-signal-600">the model</Link>.
      </p>

      <p className="step-in mt-12 text-[15px] leading-relaxed text-ink-700" style={{ animationDelay: '800ms' }}>
        Everything you’ve just used was built from Field’s public catalogue alone. When you want it
        pointed at the real thing, reply to the message this link arrived in.
      </p>

      <div className="step-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: '950ms' }}>
        <button
          onClick={onRestart}
          className="rounded-[2px] border border-ink-300 px-5 py-2.5 text-[13px] text-ink-800 transition-colors hover:border-signal-600 hover:text-signal-700"
        >
          ↺ Try another request
        </button>
        <Link href="/demos" className="text-[13px] text-signal-600 transition-colors hover:text-action-600">
          Explore each demo on its own →
        </Link>
      </div>
    </div>
  );
}
