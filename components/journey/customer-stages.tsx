'use client';

import { useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardList, ExternalLink, FileSearch,
  ListChecks, Plane, Plus, Search, Send, Timer, Cog,
} from 'lucide-react';
import { EXAMPLE_REQUESTS, aircraftLabel, duration } from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import { Badge, Button, Thumb, type Tone } from '@/components/journey/ui.tsx';

const MATCH: Record<SimLine['matchClass'], { text: string; tone: Tone }> = {
  strong: { text: 'Direct match', tone: 'green' },
  potential: { text: 'Likely match', tone: 'blue' },
  alternative: { text: 'Alternative', tone: 'grey' },
  none: { text: 'Partial match', tone: 'grey' },
};

/* ------------------------------------------------------------- 1 request */

export function RequestScreen({
  value, onChange, onSubmit, busy, error,
}: {
  value: string; onChange: (v: string) => void;
  onSubmit: () => void; busy: boolean; error: string | null;
}) {
  return (
    <div>
      <section
        className="relative overflow-hidden bg-signal-900 px-4 pb-10 pt-8 sm:px-10 sm:pb-12 sm:pt-10"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 80% 0%, rgba(79,133,198,0.35), transparent 60%), linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: 'auto, 28px 28px, 28px 28px',
        }}
      >
        <p className="text-[10.5px] font-semibold tracking-[0.16em] text-signal-300">FIND A PART</p>
        <h2 className="mt-2 max-w-lg text-[26px] font-semibold leading-tight tracking-tight text-white">
          Tell us the job. We’ll find the tooling.
        </h2>
        <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-signal-100/70">
          Describe the aircraft and the task in your own words. Part numbers aren’t needed.
        </p>

        <div className="mt-6 max-w-2xl rounded-xl bg-white p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
          <textarea
            autoFocus
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
            placeholder="e.g. We need tooling to remove the thrust reverser on a 737-800, within six weeks."
            aria-label="Your request"
            className="w-full resize-none rounded-lg bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300"
          />
          <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-2 pt-2">
            <span className="hidden text-[11px] text-ink-400 sm:block">Press Enter to search</span>
            <button
              onClick={onSubmit}
              disabled={busy || value.trim().length < 3}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-signal-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-signal-500 disabled:opacity-40"
            >
              <Search className="h-4 w-4" />
              {busy ? 'Searching the catalogue…' : 'Find the parts'}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-[12.5px] text-[#ffb4b4]">{error}</p>}

        <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] text-signal-200/60">Try:</span>
          {EXAMPLE_REQUESTS.map((ex) => (
            <button
              key={ex}
              onClick={() => onChange(ex)}
              className="rounded-full bg-white/[0.08] px-3 py-1 text-left text-[11.5px] text-signal-100/85 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.14]"
            >
              {ex.length > 52 ? `${ex.slice(0, 50)}…` : ex}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-px bg-ink-100 sm:grid-cols-3">
        {[
          { icon: FileSearch, t: 'Searches the full catalogue', d: 'Every published Field product, by aircraft, engine and task.' },
          { icon: ListChecks, t: 'Shows why each part fits', d: 'The catalogue facts behind every result.' },
          { icon: Send, t: 'One request, one quote', d: 'Pick the parts and send them in a single request.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="flex gap-3 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-signal-50 text-signal-600">
              <Icon className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[12.5px] font-semibold text-ink-900">{t}</span>
              <span className="block text-[11.5px] leading-snug text-ink-500">{d}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- 2 parts */

export interface QuoteForm { email: string; company: string }

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function PartsScreen({
  found, excluded, onToggle, form, onForm, sent, onSend, onEdit, accountNames,
}: {
  found: SimRfq;
  excluded: number[];
  onToggle: (line: number) => void;
  form: QuoteForm;
  onForm: (f: QuoteForm) => void;
  sent: { email: string; company: string; reference: string } | null;
  onSend: () => void;
  onEdit: () => void;
  accountNames: string[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const chosen = found.lines.filter((l) => !excluded.includes(l.line));

  if (sent) return <Sent sent={sent} chosen={chosen} />;

  const chips: Array<{ icon: typeof Plane; text: string }> = [
    ...(found.aircraft ? [{ icon: Plane, text: `${aircraftLabel(found.aircraft)}${found.variant ? ` (-${found.variant})` : ''}` }] : []),
    ...(found.engine ? [{ icon: Cog, text: found.engine }] : []),
    ...(found.deadlineDays ? [{ icon: Timer, text: `Needed within ${duration(found.deadlineDays)}` }] : []),
  ];

  return (
    <div>
      {/* ------------------------------------------------------ search bar */}
      <div className="border-b border-ink-100 bg-ink-25 px-4 py-3 sm:px-8 sm:py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 text-[12.5px] text-ink-700 ring-1 ring-ink-200">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-400" />
            <span className="truncate">{found.request}</span>
          </span>
          <Button onClick={onEdit}>Edit request</Button>
        </div>
        {chips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-400">We read:</span>
            {chips.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-ink-700 ring-1 ring-ink-200">
                <Icon className="h-3 w-3 text-signal-500" /> {text}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-8 sm:py-6 lg:grid-cols-[1fr_270px]">
        {/* ------------------------------------------------------- results */}
        <div className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink-950">
              {found.lines.length} parts for this job
            </h2>
            <span className="text-[11.5px] text-ink-400">Closest match first</span>
          </div>

          <ul className="space-y-2.5">
            {found.lines.map((l) => {
              const on = !excluded.includes(l.line);
              const isOpen = open === l.line;
              return (
                <li key={l.line} className={`overflow-hidden rounded-xl border bg-white transition-colors ${on ? 'border-ink-200' : 'border-ink-100 opacity-55'}`}>
                  <div className="flex items-start gap-3 p-3 sm:gap-3.5 sm:p-3.5">
                    <Thumb src={l.image} size={52} alt={l.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={MATCH[l.matchClass].tone} dot>{MATCH[l.matchClass].text}</Badge>
                        <span className="mono text-[11px] text-ink-400">{l.partNumber}</span>
                      </div>
                      <p className="mt-1 text-[13px] font-medium leading-snug text-ink-900">{l.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-ink-500">
                        {l.aircraft && <span className="flex items-center gap-1"><Plane className="h-3 w-3" />{aircraftLabel(l.aircraft)}</span>}
                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{l.leadTimeDays !== null ? `${duration(l.leadTimeDays)} lead time` : 'Lead time on request'}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onToggle(l.line)}
                      disabled={asking}
                      aria-label={on ? 'Remove from basket' : 'Add to basket'}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] sm:px-3 font-medium transition-colors disabled:cursor-not-allowed ${
                        on ? 'bg-signal-50 text-signal-700 ring-1 ring-inset ring-signal-600/20' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-25'
                      }`}
                    >
                      {on ? <><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">In basket</span></> : <><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add</span></>}
                    </button>
                  </div>
                  <button
                    onClick={() => setOpen(isOpen ? null : l.line)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-1.5 border-t border-ink-100 bg-ink-25 px-3.5 py-2 text-left text-[11.5px] font-medium text-signal-700 hover:bg-ink-50"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    Why this part?
                  </button>
                  {isOpen && (
                    <div className="step-in border-t border-ink-100 px-3.5 py-3">
                      <p className="mb-2 text-[11px] text-ink-400">Picked because the catalogue record says:</p>
                      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                        {l.evidence.map((e) => (
                          <div key={`${e.label}-${e.value}`} className="flex gap-2 text-[12px]">
                            <dt className="w-28 shrink-0 text-ink-400">{e.label}</dt>
                            <dd className="min-w-0 text-ink-800">{e.value}</dd>
                          </div>
                        ))}
                      </dl>
                      <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-signal-600 hover:text-action-600">
                        View the catalogue page <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* -------------------------------------------------------- basket */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-[0_8px_24px_-12px_rgba(4,24,47,0.2)]">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                <ClipboardList className="h-4 w-4 text-signal-600" /> Quote basket
              </p>
              <span className="text-[11.5px] text-ink-400">{chosen.length} {chosen.length === 1 ? 'part' : 'parts'}</span>
            </div>
            <ul className="max-h-48 divide-y divide-ink-50 overflow-y-auto px-4">
              {chosen.map((l) => (
                <li key={l.line} className="flex items-center gap-2.5 py-2">
                  <Thumb src={l.image} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="mono block text-[11px] text-ink-900">{l.partNumber}</span>
                    <span className="block truncate text-[10.5px] text-ink-400">{l.name}</span>
                  </span>
                  <span className="text-[11px] text-ink-400">×1</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-100 p-4">
              {!asking ? (
                <button
                  onClick={() => setAsking(true)}
                  disabled={!chosen.length}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-signal-600 text-[13px] font-medium text-white transition-colors hover:bg-signal-500 disabled:opacity-40"
                >
                  Request a quote <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="step-in space-y-3">
                  <p className="text-[12.5px] font-semibold text-ink-900">Where should we send the quote?</p>
                  <Input label="Work email" type="email" autoFocus value={form.email} placeholder="name@company.com"
                    onChange={(v) => onForm({ ...form, email: v })} />
                  <Input label="Company" value={form.company} placeholder="Company name" list="field-accounts"
                    onChange={(v) => onForm({ ...form, company: v })} />
                  <datalist id="field-accounts">
                    {accountNames.map((n) => <option key={n} value={n} />)}
                  </datalist>
                  <div className="rounded-lg bg-ink-25 p-2.5 text-[10.5px] leading-relaxed text-ink-500">
                    For a full account history on Field’s side, use a synthetic customer:
                    <span className="mt-1 flex flex-wrap gap-1">
                      {accountNames.slice(0, 4).map((n) => (
                        <button key={n} onClick={() => onForm({ ...form, company: n })} className="rounded bg-white px-1.5 py-0.5 text-[10.5px] text-signal-700 ring-1 ring-ink-200 hover:ring-signal-300">
                          {n}
                        </button>
                      ))}
                    </span>
                  </div>
                  <button
                    onClick={onSend}
                    disabled={!validEmail(form.email) || form.company.trim().length < 2}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-action-600 text-[13px] font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Send to Field
                  </button>
                  <p className="text-center text-[10.5px] text-ink-400">Mock-up: nothing leaves this browser tab.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-ink-25 p-4">
            <p className="text-[12px] font-semibold text-ink-900">How we found these</p>
            <ol className="mt-3 space-y-3">
              <How n={1} title="Read your request">
                {found.understood.length
                  ? found.understood.map((u) => (
                    <span key={u.label} className="block">
                      <span className="text-ink-400">{u.label.replace(' identified', '')}:</span> {u.value}
                      {u.note && <span className="block text-caution-600">{u.note}</span>}
                    </span>
                  ))
                  : 'No aircraft or deadline named, so it searched on the description.'}
              </How>
              <How n={2} title={`Searched the catalogue in ${found.searchMs} ms`}>
                {found.searchSteps.map((s) => (
                  <span key={s.label} className="block"><span className="text-ink-700">{s.label}</span> — {s.detail}</span>
                ))}
              </How>
              <How n={3} title={`Kept the ${found.lines.length} closest of ${found.considered.toLocaleString()} relevant records`}>
                Direct matches first, then likely ones.
              </How>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, type = 'text', autoFocus, list,
}: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; autoFocus?: boolean; list?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-600">{label}</span>
      <input
        type={type}
        autoFocus={autoFocus}
        list={list}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-9 w-full rounded-lg border border-ink-200 px-2.5 text-[12.5px] text-ink-900 outline-none transition-shadow placeholder:text-ink-300 focus:border-signal-500 focus:ring-2 focus:ring-signal-500/15"
      />
    </label>
  );
}

function How({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-1.5">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-signal-100 text-[9.5px] font-semibold text-signal-700">{n}</span>
      <div>
        <p className="mb-0.5 text-[11.5px] font-medium text-ink-900">{title}</p>
        <div className="text-[11px] leading-relaxed text-ink-500">{children}</div>
      </div>
    </li>
  );
}

function Sent({ sent, chosen }: { sent: { email: string; company: string; reference: string }; chosen: SimLine[] }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-strong-600" strokeWidth={1.6} />
        <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-ink-950">Request sent</h2>
        <p className="mt-1 text-[13px] text-ink-500">Thank you. Field has your request for {chosen.length} {chosen.length === 1 ? 'part' : 'parts'}.</p>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-ink-200">
        <dl className="divide-y divide-ink-100 text-[12.5px]">
          {([['Reference', <span key="r" className="mono">{sent.reference}</span>], ['Company', sent.company], ['Confirmation to', sent.email]] as const).map(([k, v]) => (
            <div key={k} className="flex gap-4 px-4 py-2.5">
              <dt className="w-32 shrink-0 text-ink-400">{k}</dt>
              <dd className="text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-6 text-[12px] font-semibold text-ink-900">What happens next</p>
      <ol className="mt-2 space-y-2">
        {['Field checks each part against your aircraft and task.', 'Lead times are confirmed with suppliers where needed.', 'You receive a quote with prices and delivery dates.'].map((t, i) => (
          <li key={t} className="flex gap-2.5 text-[12.5px] text-ink-600">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-signal-50 text-[10.5px] font-semibold text-signal-700">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-[11px] text-ink-400">Mock-up: nothing has been sent, and your details stay in this browser tab.</p>
    </div>
  );
}
