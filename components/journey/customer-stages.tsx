'use client';

import { useState } from 'react';
import { EXAMPLE_REQUESTS, aircraftLabel, duration } from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';

const MATCH: Record<SimLine['matchClass'], { text: string; cls: string }> = {
  strong: { text: 'Direct match', cls: 'text-strong-600' },
  potential: { text: 'Likely match', cls: 'text-signal-600' },
  alternative: { text: 'Alternative', cls: 'text-ink-500' },
  none: { text: 'Partial match', cls: 'text-ink-500' },
};

/* ------------------------------------------------------------- 1 request */

export function RequestScreen({
  value, onChange, onSubmit, busy, error,
}: {
  value: string; onChange: (v: string) => void;
  onSubmit: () => void; busy: boolean; error: string | null;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-[22px] font-light tracking-tight text-ink-950">What do you need tooling for?</h2>
      <p className="mt-1.5 text-[13px] text-ink-500">Describe the aircraft and the job. Part numbers aren’t needed.</p>

      <div className="mt-6 rounded-[4px] border border-ink-200 p-3 focus-within:border-signal-500">
        <textarea
          autoFocus
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder="e.g. We need tooling to remove the thrust reverser on a 737-800, within six weeks."
          aria-label="Your request"
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300"
        />
      </div>

      <p className="mt-4 text-[11px] text-ink-400">Or try one of these:</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {EXAMPLE_REQUESTS.map((ex) => (
          <button
            key={ex}
            onClick={() => onChange(ex)}
            className="rounded-[3px] border border-ink-100 bg-ink-25 px-2.5 py-1 text-left text-[11.5px] text-ink-500 transition-colors hover:border-signal-300 hover:text-signal-600"
          >
            {ex.length > 60 ? `${ex.slice(0, 58)}…` : ex}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          onClick={onSubmit}
          disabled={busy || value.trim().length < 3}
          className="rounded-[3px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600 disabled:opacity-35"
        >
          {busy ? 'Searching the catalogue…' : 'Find the parts'}
        </button>
        {error && <p className="text-[12.5px] text-action-600">{error}</p>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- 2 parts */

export interface QuoteForm { email: string; company: string }

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function PartsScreen({
  found, excluded, onToggle, form, onForm, sent, onSend, accountNames,
}: {
  found: SimRfq;
  excluded: number[];
  onToggle: (line: number) => void;
  form: QuoteForm;
  onForm: (f: QuoteForm) => void;
  sent: { email: string; company: string; reference: string } | null;
  onSend: () => void;
  accountNames: string[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const chosen = found.lines.filter((l) => !excluded.includes(l.line));
  const read = found.understood.filter((u) => u.value);

  if (sent) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <p className="mono text-[10.5px] tracking-[0.12em] text-strong-600">REQUEST SENT</p>
        <h2 className="mt-2 text-[22px] font-light tracking-tight text-ink-950">Thank you — Field has your request.</h2>
        <dl className="mt-6 divide-y divide-ink-100 border-y border-ink-100 text-[13px]">
          <Row k="Reference" v={<span className="mono">{sent.reference}</span>} />
          <Row k="Company" v={sent.company} />
          <Row k="Confirmation to" v={sent.email} />
          <Row k="Parts" v={`${chosen.length} ${chosen.length === 1 ? 'item' : 'items'}`} />
        </dl>
        <p className="mt-4 text-[11.5px] text-ink-400">Mock-up: nothing has been sent, and your details stay in this browser tab.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_15rem]">
      <div className="min-w-0">
        <h2 className="text-[20px] font-light tracking-tight text-ink-950">
          We found {found.lines.length} {found.lines.length === 1 ? 'part' : 'parts'} for this job.
        </h2>
        <p className="mt-1 text-[12.5px] text-ink-500">
          Untick anything you don’t need. Select “Why?” to see what the catalogue says about each one.
        </p>

        <ul className="mt-5 divide-y divide-ink-100 border-y border-ink-100">
          {found.lines.map((l) => {
            const on = !excluded.includes(l.line);
            return (
              <li key={l.line} className={on ? '' : 'opacity-45'}>
                <div className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={asking}
                    onChange={() => onToggle(l.line)}
                    aria-label={`Include ${l.partNumber}`}
                    className="mt-[3px] h-3.5 w-3.5 shrink-0 accent-signal-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-ink-900">{l.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink-400">
                      <span className="mono text-signal-600">{l.partNumber}</span>
                      {l.aircraft && <span>{aircraftLabel(l.aircraft)}</span>}
                      <span>{l.leadTimeDays !== null ? `Lead time ${duration(l.leadTimeDays)}` : 'Lead time on request'}</span>
                      <span className={MATCH[l.matchClass].cls}>{MATCH[l.matchClass].text}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(open === l.line ? null : l.line)}
                    aria-expanded={open === l.line}
                    className="shrink-0 text-[11.5px] text-signal-600 hover:text-action-600"
                  >
                    {open === l.line ? 'Hide' : 'Why?'}
                  </button>
                </div>
                {open === l.line && (
                  <div className="step-in mb-3 ml-[26px] rounded-[3px] bg-ink-25 px-3 py-2.5">
                    <p className="mb-1.5 text-[11px] text-ink-400">Picked because the catalogue record says:</p>
                    <ul className="space-y-0.5">
                      {l.evidence.map((e) => (
                        <li key={`${e.label}-${e.value}`} className="flex gap-3 text-[12px]">
                          <span className="w-28 shrink-0 text-ink-400">{e.label}</span>
                          <span className="text-ink-800">{e.value}</span>
                        </li>
                      ))}
                    </ul>
                    <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-block text-[11px] text-signal-600 hover:text-action-600">
                      Catalogue page ↗
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!asking ? (
          <button
            onClick={() => setAsking(true)}
            disabled={!chosen.length}
            className="mt-6 rounded-[3px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600 disabled:opacity-35"
          >
            Request a quote for {chosen.length} {chosen.length === 1 ? 'part' : 'parts'}
          </button>
        ) : (
          <div className="step-in mt-6 rounded-[4px] border border-ink-200 p-4">
            <p className="text-[13px] font-medium text-ink-900">Where should Field send the quote?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] text-ink-500">Work email</span>
                <input
                  type="email"
                  autoFocus
                  value={form.email}
                  onChange={(e) => onForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com"
                  className="mt-1 w-full rounded-[3px] border border-ink-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-signal-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-ink-500">Company</span>
                <input
                  list="field-accounts"
                  value={form.company}
                  onChange={(e) => onForm({ ...form, company: e.target.value })}
                  placeholder="Company name"
                  className="mt-1 w-full rounded-[3px] border border-ink-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-signal-500"
                />
                <datalist id="field-accounts">
                  {accountNames.map((n) => <option key={n} value={n} />)}
                </datalist>
              </label>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              To see a full account history on Field’s side, use one of the synthetic customers:{' '}
              {accountNames.slice(0, 4).map((n, i) => (
                <span key={n}>
                  {i > 0 && ', '}
                  <button onClick={() => onForm({ ...form, company: n })} className="text-signal-600 underline decoration-dotted underline-offset-2 hover:text-action-600">{n}</button>
                </span>
              ))}
              . Mock-up: nothing leaves this browser tab.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={onSend}
                disabled={!validEmail(form.email) || form.company.trim().length < 2}
                className="rounded-[3px] bg-action-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-35"
              >
                Send to Field
              </button>
              <button onClick={() => setAsking(false)} className="text-[11.5px] text-ink-400 hover:text-signal-600">Change parts</button>
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- how we found them */}
      <aside className="h-fit rounded-[4px] bg-ink-25 p-4 text-[12px]">
        <p className="text-[11.5px] font-semibold text-ink-800">How we found these</p>
        <ol className="mt-3 space-y-3.5">
          <How n={1} title="Read your request">
            {read.length ? (
              <ul className="space-y-0.5">
                {read.map((u) => (
                  <li key={u.label}>
                    <span className="text-ink-400">{u.label.replace(' identified', '')}:</span> <span className="text-ink-800">{u.value}</span>
                    {u.note && <span className="block text-[11px] leading-snug text-caution-600">{u.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-ink-500">No aircraft or deadline named, so it searched on the description.</span>
            )}
          </How>
          <How n={2} title={`Searched the catalogue in ${found.searchMs} ms`}>
            <ul className="space-y-0.5 text-ink-500">
              {found.searchSteps.map((s) => (
                <li key={s.label}><span className="text-ink-700">{s.label}</span> — {s.detail}</li>
              ))}
            </ul>
          </How>
          <How n={3} title={`Kept the ${found.lines.length} closest of ${found.considered.toLocaleString()} relevant records`}>
            <span className="text-ink-500">Direct matches first, then likely ones.</span>
          </How>
        </ol>
      </aside>
    </div>
  );
}

function How({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1rem_1fr] gap-1.5">
      <span className="mono text-[11px] text-signal-400">{n}</span>
      <div>
        <p className="mb-1 text-[12px] text-ink-900">{title}</p>
        <div className="text-[11.5px] leading-relaxed">{children}</div>
      </div>
    </li>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2">
      <dt className="w-32 shrink-0 text-ink-400">{k}</dt>
      <dd className="text-ink-900">{v}</dd>
    </div>
  );
}
