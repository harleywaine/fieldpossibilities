'use client';

import { useState } from 'react';
import { EXAMPLE_REQUESTS, duration } from '@/lib/journey.ts';
import type { SimRfq, SimLine, SimCustomer } from '@/lib/simulation/rfq.ts';

export type Decision = 'approve' | 'remove' | 'query';

/* ------------------------------------------------------------ shared bits */

/** The halt. Shown at the top of any step waiting on the viewer. */
export function YourDecision({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`mb-8 flex items-start gap-3 border-l-2 py-1 pl-4 transition-colors ${
        done ? 'border-[color:var(--color-strong-600)]' : 'border-[color:var(--color-caution-500)]'
      }`}
    >
      <span className="relative mt-[5px] flex h-2 w-2 shrink-0">
        {!done && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-caution-500)] opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${done ? 'bg-[color:var(--color-strong-600)]' : 'bg-[color:var(--color-caution-500)]'}`} />
      </span>
      <div>
        <p className={`mono text-[10.5px] tracking-[0.12em] ${done ? 'text-[color:var(--color-strong-600)]' : 'text-[color:var(--color-caution-600)]'}`}>
          {done ? 'DECIDED — THE PROCESS CAN CONTINUE' : 'YOUR DECISION — THE PROCESS HAS STOPPED'}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{children}</p>
      </div>
    </div>
  );
}

function Choice({
  active, onClick, children, tone = 'neutral',
}: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'neutral' | 'go' | 'stop' }) {
  const on = {
    neutral: 'border-signal-600 bg-signal-600 text-white',
    go: 'border-[color:var(--color-strong-600)] bg-[color:var(--color-strong-600)] text-white',
    stop: 'border-action-600 bg-action-600 text-white',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`rounded-[2px] border px-3 py-1.5 text-[12px] transition-colors ${
        active ? on : 'border-ink-200 text-ink-700 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  );
}

function Part({ l }: { l: SimLine }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-4">
      <span className="mono w-28 shrink-0 text-[13px] text-signal-600">{l.partNumber ?? '—'}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink-700">{l.name}</span>
    </span>
  );
}

function Pending({ text = 'LOADING…' }: { text?: string }) {
  return <p className="mono text-[11px] tracking-[0.08em] text-ink-300">{text}</p>;
}

/* ------------------------------------------------------------- 1 request */

export function RequestStage({
  value, onChange, customers, customerId, onCustomer, onSubmit, busy, error,
}: {
  value: string; onChange: (v: string) => void;
  customers: SimCustomer[]; customerId: string; onCustomer: (id: string) => void;
  onSubmit: () => void; busy: boolean; error: string | null;
}) {
  return (
    <div>
      <div className="border-b border-ink-300 pb-2 focus-within:border-signal-600">
        <textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder="e.g. We need tooling to remove the thrust reverser on a 737-800, within six weeks."
          aria-label="The customer’s request"
          className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLE_REQUESTS.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className="rounded-[2px] border border-ink-200 px-2.5 py-1 text-left text-[11.5px] text-ink-500 transition-colors hover:border-signal-300 hover:text-signal-600"
          >
            {ex.length > 64 ? `${ex.slice(0, 62)}…` : ex}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <label className="flex items-center gap-3 text-[12.5px] text-ink-500">
          Sent by
          <select
            value={customerId}
            onChange={(e) => onCustomer(e.target.value)}
            className="rounded-[2px] border border-ink-200 bg-white px-2 py-1.5 text-[12.5px] text-ink-800 outline-none focus:border-signal-600"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.country}</option>
            ))}
          </select>
          <span className="mono text-[10px] tracking-[0.08em] text-[color:var(--color-caution-600)]">SYNTHETIC</span>
        </label>
      </div>

      <div className="mt-10 flex items-center gap-5">
        <button
          onClick={onSubmit}
          disabled={busy || value.trim().length < 3}
          className="rounded-[2px] bg-action-600 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-35"
        >
          {busy ? 'Reading the request…' : 'Send to Field →'}
        </button>
        {error && <p className="text-[12.5px] text-action-600">{error}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 2 rfq */

export function RfqStage({ rfq }: { rfq: SimRfq }) {
  const [open, setOpen] = useState<number | null>(null);
  const details: Array<[string, string]> = [
    ['Customer', `${rfq.customer.name} · ${rfq.customer.country}`],
    ['Aircraft', rfq.aircraft ? `${rfq.aircraft}${rfq.variant ? ` (customer said -${rfq.variant})` : ''}` : 'Not stated'],
    ['Engine', rfq.engine ?? 'Not stated'],
    ['Needed by', rfq.deadlineDays ? `${rfq.deadlineDays} days (${rfq.deadlinePhrase})` : 'Not stated'],
  ];
  return (
    <div className="space-y-12">
      {/* ---------------------------------------------------- the document */}
      <section className="rounded-[2px] border border-ink-200">
        <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 px-5 py-3">
          <p className="mono text-[11px] tracking-[0.1em] text-ink-500">REQUEST FOR QUOTATION</p>
          <p className="mono text-[11px] text-ink-400">{rfq.reference}</p>
        </div>
        <dl className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-ink-400">{k}</dt>
              <dd className="mt-0.5 text-[13.5px] text-ink-800">{v}</dd>
            </div>
          ))}
        </dl>
        <ol className="border-t border-ink-100">
          {rfq.lines.map((l, i) => (
            <li key={l.line} className="step-in border-b border-ink-100 last:border-0" style={{ animationDelay: `${i * 90}ms` }}>
              <button
                onClick={() => setOpen(open === l.line ? null : l.line)}
                className="flex w-full items-baseline gap-4 px-5 py-3 text-left transition-colors hover:bg-ink-25"
                aria-expanded={open === l.line}
              >
                <span className="mono w-6 shrink-0 text-[11px] text-ink-300">{String(l.line).padStart(2, '0')}</span>
                <Part l={l} />
                <span className="mono shrink-0 text-[11px] text-ink-400">×{l.quantity}</span>
                <span className="shrink-0 text-[11px] text-signal-600">{open === l.line ? 'Hide' : 'Why?'}</span>
              </button>
              {open === l.line && (
                <div className="step-in bg-ink-25 px-5 pb-4 pl-[4.25rem]">
                  <p className="mb-2 text-[11.5px] text-ink-400">Chosen because the catalogue record says:</p>
                  <ul className="space-y-1">
                    {l.evidence.map((e) => (
                      <li key={`${e.label}-${e.value}`} className="flex gap-3 text-[12.5px]">
                        <span className="w-32 shrink-0 text-ink-400">{e.label}</span>
                        <span className="text-ink-800">{e.value}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-block text-[11.5px] text-signal-600 hover:text-action-600">
                    See it on fieldinternational.com ↗
                  </a>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------- how it got here */}
      <section>
        <p className="mono mb-5 text-[10.5px] tracking-[0.12em] text-ink-400">HOW THE SYSTEM BUILT THIS</p>
        <ol className="space-y-7">
          <How n={1} title="It read the message">
            {rfq.understood.length ? (
              <ul className="space-y-1.5">
                {rfq.understood.map((u) => (
                  <li key={u.label} className="text-[13px] text-ink-700">
                    <span className="text-ink-400">{u.label.replace(' identified', '')}:</span> {u.value}
                    {u.note && <span className="block text-[12px] text-[color:var(--color-caution-600)]">{u.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500">No aircraft, engine or deadline named — it searched on the description alone.</p>
            )}
          </How>
          <How n={2} title={`It searched all ${'catalogue'} records in ${rfq.searchMs} ms`}>
            <ul className="space-y-1">
              {rfq.searchSteps.map((s) => (
                <li key={s.label} className="text-[12.5px] text-ink-500">
                  <span className="text-ink-700">{s.label}</span> — {s.detail}
                </li>
              ))}
            </ul>
          </How>
          <How n={3} title={`It kept the ${rfq.lines.length} closest of ${rfq.considered.toLocaleString()} relevant records`}>
            <p className="text-[12.5px] text-ink-500">Select any line above to see the evidence it was picked on.</p>
          </How>
        </ol>
      </section>
    </div>
  );
}

function How({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-2">
      <span className="mono text-[12px] text-signal-400">{n}</span>
      <div>
        <p className="mb-2 text-[14px] text-ink-900">{title}</p>
        {children}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------- 3 research */

const RESEARCH = ['Customer', 'Internal owner', 'Previous interactions', 'Previous quote', 'Potential issue'];

export function ResearchStage({ brief }: { brief: any | null }) {
  if (!brief) return <Pending text="READING THE ACCOUNT…" />;
  const fields = RESEARCH.map((l) => brief.fields.find((f: any) => f.label === l)).filter(Boolean);
  return (
    <div>
      <p className="mono mb-2 text-[11px] text-ink-400">
        {brief.retrieval?.documents?.length ?? 0} internal documents read in {brief.retrieval?.trace?.durationMs ?? '—'} ms
      </p>
      <dl>
        {fields.map((f: any, i: number) => (
          <div key={f.label} className="step-in grid grid-cols-[9rem_1fr] gap-4 border-b border-ink-100 py-3.5" style={{ animationDelay: `${i * 120}ms` }}>
            <dt className="text-[12px] text-ink-400">{f.label}</dt>
            <dd>
              <p className="text-[13.5px] leading-snug text-ink-800">{f.value}</p>
              {f.citations?.[0] && <p className="mono mt-1 text-[10.5px] text-ink-300">from {f.citations[0].path}</p>}
            </dd>
          </div>
        ))}
      </dl>
      {fields.length <= 2 && (
        <p className="mt-4 text-[12.5px] text-ink-500">
          Little history on this account — which is itself worth knowing before replying.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- 4 check */

export function CheckStage({ rfq }: { rfq: SimRfq }) {
  const status = (l: SimLine) => {
    const r = l.flags.some((f) => f.kind === 'review');
    const s = l.flags.some((f) => f.kind === 'supplier');
    return r ? 'review' : s ? 'supplier' : 'ready';
  };
  const colour = { ready: 'bg-signal-600', review: 'bg-[color:var(--color-caution-500)]', supplier: 'bg-ink-300' };
  const count = (k: string) => rfq.lines.filter((l) => status(l) === k).length;
  return (
    <div>
      <ul>
        {rfq.lines.map((l, i) => (
          <li key={l.line} className="step-in border-b border-ink-100 py-3" style={{ animationDelay: `${i * 160}ms` }}>
            <div className="flex items-center gap-4">
              <span className={`h-3 w-3 shrink-0 rounded-[1px] ${colour[status(l)]}`} />
              <Part l={l} />
            </div>
            {l.flags.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 pl-7">
                {l.flags.map((f, j) => (
                  <li key={j} className="text-[12px] text-ink-500">
                    <span className={`mono mr-2 text-[10px] ${f.kind === 'review' ? 'text-[color:var(--color-caution-600)]' : 'text-ink-400'}`}>
                      {f.kind === 'review' ? 'ENGINEER' : 'SUPPLIER'}
                    </span>
                    {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <dl className="step-in mt-6 space-y-1.5" style={{ animationDelay: `${rfq.lines.length * 160 + 100}ms` }}>
        <Legend c={colour.ready} n={count('ready')} t="ready to quote as it stands" />
        <Legend c={colour.review} n={count('review')} t="need an engineer’s judgement" />
        <Legend c={colour.supplier} n={count('supplier')} t="need a lead time confirmed by the supplier" />
      </dl>
    </div>
  );
}

function Legend({ c, n, t }: { c: string; n: number; t: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[1px] ${c}`} />
      <span className="mono w-5 text-[14px] text-ink-900">{n}</span>
      <span className="text-[13px] text-ink-500">{t}</span>
    </div>
  );
}

/* --------------------------------------------------------------- 5 review */

export function ReviewStage({
  lines, decisions, onDecide,
}: { lines: SimLine[]; decisions: Record<number, Decision>; onDecide: (line: number, d: Decision) => void }) {
  const pending = lines.filter((l) => !decisions[l.line]);
  const done = pending.length === 0;
  if (!lines.length) {
    return (
      <p className="text-[14px] text-ink-600">
        Nothing needs an engineer this time — every line establishes what the customer asked for.
      </p>
    );
  }
  return (
    <div>
      <YourDecision done={done}>
        {done
          ? 'Every flagged line has an engineer’s decision.'
          : `${pending.length} ${pending.length === 1 ? 'line needs' : 'lines need'} your call. The system has shown its reasons; it will not decide for you.`}
      </YourDecision>
      <ul>
        {lines.map((l) => {
          const d = decisions[l.line];
          return (
            <li key={l.line} className="border-b border-ink-100 py-4">
              <Part l={l} />
              <ul className="mt-2 space-y-0.5 pl-32">
                {l.flags.filter((f) => f.kind === 'review').map((f, i) => (
                  <li key={i} className="text-[12.5px] leading-relaxed text-ink-500">{f.reason}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2 pl-32">
                <Choice active={d === 'approve'} tone="go" onClick={() => onDecide(l.line, 'approve')}>Approve for the quote</Choice>
                <Choice active={d === 'query'} onClick={() => onDecide(l.line, 'query')}>Ask the customer</Choice>
                <Choice active={d === 'remove'} tone="stop" onClick={() => onDecide(l.line, 'remove')}>Remove</Choice>
              </div>
            </li>
          );
        })}
      </ul>
      {!done && Object.keys(decisions).length > 0 && (
        <button
          onClick={() => pending.forEach((l) => onDecide(l.line, 'approve'))}
          className="mt-4 text-[12px] text-signal-600 hover:text-action-600"
        >
          Approve the remaining {pending.length} →
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 6 supplier */

export function SupplierStage({
  lines, sent, onSend, replies, deadlineDays,
}: {
  lines: SimLine[]; sent: boolean; onSend: () => void;
  replies: Record<number, number>; deadlineDays: number | null;
}) {
  if (!lines.length) {
    return <p className="text-[14px] text-ink-600">Every line on the quote already has a published lead time inside the deadline.</p>;
  }
  return (
    <div>
      <YourDecision done={sent}>
        {sent
          ? 'Enquiries sent. The replies below are simulated.'
          : `The system has drafted enquiries for ${lines.length} ${lines.length === 1 ? 'line' : 'lines'}. It won’t contact a supplier without your approval.`}
      </YourDecision>

      <ul>
        {lines.map((l, i) => {
          const days = replies[l.line];
          const late = days !== undefined && deadlineDays !== null && days > deadlineDays;
          return (
            <li key={l.line} className="flex items-baseline gap-4 border-b border-ink-100 py-3">
              <Part l={l} />
              <span className="shrink-0 whitespace-nowrap text-right">
                {sent && days !== undefined ? (
                  <span className="step-in mono text-[12.5px]" style={{ animationDelay: `${i * 350 + 300}ms` }}>
                    <span className={late ? 'text-action-600' : 'text-ink-900'}>{duration(days)}</span>
                    <span className="ml-2 text-[10px] text-ink-300">SIMULATED</span>
                  </span>
                ) : (
                  <span className="mono text-[11px] text-ink-300">{sent ? 'awaiting…' : 'not yet asked'}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {!sent && (
        <div className="mt-6">
          <p className="mb-3 border-l border-ink-200 pl-4 text-[12.5px] leading-relaxed text-ink-500">
            “Please confirm your current lead time for the items listed, for delivery to Field. We are
            quoting a customer who needs them within {deadlineDays ? `${deadlineDays} days` : 'a stated window'}.”
          </p>
          <button onClick={onSend} className="rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600">
            Approve and send the enquiries
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- 7 approval */

export function ApprovalStage({
  rfq, included, held, leadDays, deliveryDays, decision, onDecide,
}: {
  rfq: SimRfq; included: SimLine[]; held: SimLine[];
  leadDays: (l: SimLine) => number; deliveryDays: number | null;
  decision: 'approved' | 'returned' | null; onDecide: (d: 'approved' | 'returned') => void;
}) {
  const late = deliveryDays !== null && rfq.deadlineDays !== null && deliveryDays > rfq.deadlineDays;
  const lateCount = rfq.deadlineDays === null ? 0 : included.filter((l) => leadDays(l) > rfq.deadlineDays!).length;
  const lateLines = `${lateCount} ${lateCount === 1 ? 'item' : 'items'}`;
  return (
    <div>
      <YourDecision done={decision === 'approved'}>
        {decision === 'approved'
          ? 'Approved. In this simulation nothing is actually sent.'
          : 'The quote is assembled. It goes nowhere until you release it.'}
      </YourDecision>

      <section className="rounded-[2px] border border-ink-200">
        <div className="flex items-baseline justify-between border-b border-ink-100 px-5 py-3">
          <p className="mono text-[11px] tracking-[0.1em] text-ink-500">QUOTATION · {rfq.customer.name.toUpperCase()}</p>
          <p className="mono text-[11px] text-ink-400">{rfq.reference.replace('RFQ', 'QT')}</p>
        </div>
        <ul>
          {included.map((l) => (
            <li key={l.line} className="flex items-baseline gap-4 border-b border-ink-100 px-5 py-2.5">
              <Part l={l} />
              <span className="mono w-20 shrink-0 text-right text-[12px] text-ink-700">{duration(leadDays(l), true)}</span>
              <span className="w-24 shrink-0 text-right text-[11px] italic text-ink-400">price: Commercial</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-3">
          <span className="text-[12.5px] text-ink-500">Delivery position</span>
          <span className={`mono text-[13px] ${late ? 'text-action-600' : 'text-ink-900'}`}>
            {deliveryDays === null
              ? '—'
              : late
                ? `${lateLines} after the deadline · latest ${duration(deliveryDays)}`
                : `all items within ${duration(deliveryDays)}`}
            {rfq.deadlineDays ? ` · deadline ${duration(rfq.deadlineDays)}` : ''}
          </span>
        </div>
      </section>
      {held.length > 0 && (
        <p className="mt-3 text-[12px] text-ink-500">
          {held.length} {held.length === 1 ? 'line is' : 'lines are'} left off pending the customer or removed on review.
        </p>
      )}
      <p className="mt-3 text-[12px] text-ink-400">
        Prices are never generated: the catalogue publishes none, so Commercial sets them.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Choice active={decision === 'approved'} tone="go" onClick={() => onDecide('approved')}>Approve and send to the customer</Choice>
        <Choice active={decision === 'returned'} onClick={() => onDecide('returned')}>Send back to engineering</Choice>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- 8 manufacture */

export function ManufactureStage({
  included, leadDays, deadlineDays, decision, onDecide,
}: {
  included: SimLine[]; leadDays: (l: SimLine) => number; deadlineDays: number | null;
  decision: string | null; onDecide: (d: string) => void;
}) {
  const longest = Math.max(...included.map(leadDays), deadlineDays ?? 0, 1);
  const scale = (d: number) => `${(d / longest) * 100}%`;
  const late = included.filter((l) => deadlineDays !== null && leadDays(l) > deadlineDays);
  return (
    <div>
      {late.length > 0 && (
        <YourDecision done={Boolean(decision)}>
          {decision
            ? `Decided: ${decision.toLowerCase()}.`
            : `${late.length} ${late.length === 1 ? 'item lands' : 'items land'} after the customer’s deadline. The system has spotted it; how to handle it is your call.`}
        </YourDecision>
      )}

      <p className="mono mb-4 text-[10.5px] tracking-[0.12em] text-ink-400">CUSTOMER ACCEPTS · ORDERS PLACED · MAKING (SIMULATED)</p>
      <div className="relative">
        {deadlineDays !== null && (
          <div className="pointer-events-none absolute bottom-0 top-0 z-10 border-l border-dashed border-action-600" style={{ left: `calc(7rem + (100% - 7rem) * ${deadlineDays / longest})` }}>
            <span className="mono absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] text-action-600">deadline</span>
          </div>
        )}
        <ul className="space-y-2.5">
          {included.map((l, i) => {
            const d = leadDays(l);
            const over = deadlineDays !== null && d > deadlineDays;
            return (
              <li key={l.line} className="flex items-center gap-0">
                <span className="mono w-28 shrink-0 text-[12px] text-signal-600">{l.partNumber}</span>
                <div className="relative h-5 flex-1">
                  <div
                    className={`step-in absolute inset-y-0 left-0 rounded-[1px] ${over ? 'bg-action-600' : 'bg-signal-600'}`}
                    style={{ width: scale(d), animationDelay: `${i * 120}ms` }}
                  />
                  {d / longest > 0.4 ? (
                    <span className="mono absolute inset-y-0 left-2 flex items-center text-[10.5px] text-white">{duration(d, true)}</span>
                  ) : (
                    <span className="mono absolute inset-y-0 flex items-center pl-2 text-[10.5px] text-ink-600" style={{ left: scale(d) }}>{duration(d, true)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {late.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-600">
          Every item lands inside the deadline. The system tracks each order and raises a flag the moment one slips.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {['Offer a phased delivery', 'Ask the supplier to expedite', 'Agree a new date with the customer'].map((o) => (
            <Choice key={o} active={decision === o} onClick={() => onDecide(o)}>{o}</Choice>
          ))}
        </div>
      )}
    </div>
  );
}
