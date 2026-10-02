'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, ChevronDown, ClipboardList, ExternalLink, FileSearch,
  ListChecks, Plane, Plus, Search, Send, Timer, Cog, Package, Globe, Mail,
} from 'lucide-react';
import { EXAMPLE_REQUESTS, DESKS, PLAYABLE, aircraftLabel, duration, variantTag, type Channel, type Region } from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import type { CrmAccount } from '@/lib/simulation/crm.ts';
import { Avatar, Badge, Button, Thumb, type Tone } from '@/components/journey/ui.tsx';
import { PHOTOS } from '@/components/journey/brand.tsx';

/** Focus the request box on arrival without scrolling the page to it; the step change has just scrolled to the top. */
function useQuietFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return ref;
}

/* --------------------------------------------------------------- 0 persona */

/** Who the viewer plays. Picking a card sets the company, the address and a request in that fleet's words. */
export function PersonaBar({
  accounts, chosen, onPick,
}: { accounts: CrmAccount[]; chosen: string | null; onPick: (accountId: string | null) => void }) {
  const cards = PLAYABLE.map((p) => ({ ...p, account: accounts.find((a) => a.id === p.accountId) })).filter((p) => p.account);
  return (
    <div className="enter mt-5" style={{ animationDelay: '160ms' }}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Play as</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((p) => {
          const a = p.account!;
          const on = chosen === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onPick(a.id)}
              className={`flex items-start gap-2.5 rounded-xl bg-white p-3 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(2,25,58,0.4)] ${on ? 'ring-2 ring-signal-600' : 'ring-ink-100'}`}
            >
              <Avatar name={a.name} size={30} square />
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-ink-950">{a.name}</span>
                <span className="block text-[11px] leading-snug text-ink-500">{p.blurb}</span>
                <span className="mt-1.5 flex flex-wrap gap-1">{a.fleet.map((f) => <span key={f} className="rounded bg-ink-50 px-1 text-[9.5px] font-medium text-ink-600">{f}</span>)}</span>
              </span>
            </button>
          );
        })}
        <button
          onClick={() => onPick(null)}
          className={`flex items-start gap-2.5 rounded-xl bg-white p-3 text-left ring-1 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(2,25,58,0.4)] ${chosen === null ? 'ring-2 ring-signal-600' : 'ring-ink-100'}`}
        >
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400">?</span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-ink-950">Someone new</span>
            <span className="block text-[11px] leading-snug text-ink-500">A company Field has never heard of. Type your own request.</span>
          </span>
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- 1b email */

/** The same request, sent the way most RFQs actually arrive: an email to a regional desk. */
export function EmailCompose({
  value, onChange, onSend, busy, error, from, company, region, onFrom, onCompany,
}: {
  value: string; onChange: (v: string) => void; onSend: () => void; busy: boolean; error: string | null;
  from: string; company: string; region: Region; onFrom: (v: string) => void; onCompany: (v: string) => void;
}) {
  const box = useQuietFocus<HTMLTextAreaElement>();
  const desk = DESKS[region];
  const subject = value.trim() ? `RFQ: ${value.trim().replace(/\s+/g, ' ').slice(0, 60)}${value.trim().length > 60 ? '…' : ''}` : 'RFQ: tooling';
  const field = 'min-w-0 flex-1 bg-transparent text-ink-800 outline-none placeholder:text-ink-300';
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-100 px-4 py-2 text-[12.5px] sm:px-6">
        <p className="flex gap-3 border-b border-ink-50 py-1.5"><span className="w-16 shrink-0 text-ink-400">From</span><input value={from} onChange={(e) => onFrom(e.target.value)} placeholder="name@your-company.com" aria-label="From" className={field} /></p>
        <p className="flex gap-3 border-b border-ink-50 py-1.5"><span className="w-16 shrink-0 text-ink-400">Company</span><input value={company} onChange={(e) => onCompany(e.target.value)} placeholder="Your company" aria-label="Company" className={field} /></p>
        <p className="flex gap-3 border-b border-ink-50 py-1.5"><span className="w-16 shrink-0 text-ink-400">To</span><span className="min-w-0 truncate text-ink-800">{desk.email} <span className="text-ink-400">· {desk.name}</span></span></p>
        <p className="flex gap-3 py-1.5"><span className="w-16 shrink-0 text-ink-400">Subject</span><span className="min-w-0 truncate text-ink-800">{subject}</span></p>
      </div>
      <div className="px-4 py-3 sm:px-6">
        <p className="text-[13px] text-ink-700">Hello,</p>
        <textarea
          ref={box}
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the aircraft, the task and when you need it, the way you would to any supplier."
          aria-label="Your request"
          className="mt-2 w-full resize-none rounded-md bg-transparent px-0 py-1 text-[14px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300"
        />
        <p className="text-[13px] text-ink-700">Please quote with delivery dates. Part list attached.</p>
        <p className="mt-3 text-[13px] text-ink-700">Regards,<br />Procurement{company ? `, ${company}` : ''}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink-25 px-2.5 py-1.5 text-[11.5px] text-ink-600 ring-1 ring-inset ring-ink-100">
          <span className="grid h-5 w-5 place-items-center rounded bg-[#1d6f42] text-[9px] font-bold text-white">X</span>
          Tooling_RFQ_part_list.xlsx
          <span className="text-[10px] text-ink-400">· synthetic attachment, the request text is what gets read</span>
        </div>
        {error && <p className="mt-3 text-[12.5px] text-action-600">{error}</p>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 sm:px-6">
        <span className="text-[11px] text-ink-400">Mock-up: nothing is sent. The text is read exactly as the website form would read it.</span>
        <button
          onClick={onSend}
          disabled={busy || value.trim().length < 3}
          className="inline-flex h-9 items-center gap-2 rounded-[3px] bg-signal-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-signal-500 disabled:opacity-40"
        >
          <Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

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
  const box = useQuietFocus<HTMLTextAreaElement>();
  return (
    <div>
      {/* Styled as a page on fieldinternational.com: the blue band their section banners use, with the globe watermark. */}
      <section className="relative overflow-hidden bg-signal-600 px-4 pb-10 pt-8 sm:px-10 sm:pb-12 sm:pt-10">
        <img src={PHOTOS.watermark} alt="" aria-hidden draggable={false} className="pointer-events-none absolute -right-8 -top-4 w-[460px] opacity-[0.08]" />
        <p className="relative text-[10.5px] font-semibold tracking-[0.16em] text-signal-200">FIND A PART</p>
        <h2 className="relative mt-2 max-w-lg text-[27px] font-light leading-tight text-white">
          Tell us the job. We’ll find the tooling.
        </h2>
        <p className="relative mt-2 max-w-lg text-[13px] leading-relaxed text-white/75">
          Describe the aircraft and the task in your own words. Part numbers aren’t needed.
        </p>

        <div className="mt-6 max-w-2xl rounded-xl bg-white p-2 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]">
          <textarea
            ref={box}
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
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-[3px] bg-action-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-action-400 disabled:opacity-40"
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

/** Website or email: the two ways the same words reach Field. Sits inside the mock-up window. */
export function ChannelTabs({ channel, onChannel }: { channel: Channel; onChannel: (c: Channel) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-100 bg-ink-25 px-3 py-2 text-[12px]">
      <span className="font-semibold text-ink-700">Send your request</span>
      <span className="inline-flex rounded-md bg-white p-0.5 ring-1 ring-ink-200" role="group" aria-label="How to send the request">
        {([['web', Globe, 'Website form'], ['email', Mail, 'Email to a sales desk']] as const).map(([c, Icon, label]) => (
          <button
            key={c}
            onClick={() => onChannel(c)}
            aria-pressed={channel === c}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1 font-medium transition-colors ${channel === c ? 'bg-signal-600 text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- 2 parts */

/** Echo the customer's own terms: "by end of next month", not "within 5.7 weeks". */
function deadlineText(days: number, phrase: string | null): string {
  if (phrase?.startsWith('by ')) return `Needed ${phrase}`;
  if (phrase && /^(end of|next )/.test(phrase)) return `Needed by ${phrase}`;
  if (phrase && /^a (fortnight|couple)/.test(phrase)) return `Needed within ${phrase}`;
  return `Needed within ${duration(days)}`;
}

export interface QuoteForm { email: string; company: string }

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function PartsScreen({
  found, basket, onToggle, form, onForm, sent, onSend, onEdit, accountNames, channel = 'web',
}: {
  found: SimRfq;
  basket: number[];
  onToggle: (line: number) => void;
  form: QuoteForm;
  onForm: (f: QuoteForm) => void;
  sent: { email: string; company: string; reference: string } | null;
  onSend: () => void;
  onEdit: () => void;
  accountNames: string[];
  channel?: Channel;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const chosen = found.lines.filter((l) => basket.includes(l.line));

  if (sent) return <Sent sent={sent} chosen={chosen} channel={channel} />;

  const item = found.understood.find((u) => u.label === 'Item identified')?.value;
  const chips: Array<{ icon: typeof Plane; text: string }> = [
    ...(found.aircraft ? [{ icon: Plane, text: `${aircraftLabel(found.aircraft)}${found.variant ? ` (${variantTag(found.variant)})` : ''}` }] : []),
    ...(found.engine ? [{ icon: Cog, text: found.engine }] : []),
    ...(item ? [{ icon: Package, text: item[0]!.toUpperCase() + item.slice(1) }] : []),
    ...(found.deadlineDays ? [{ icon: Timer, text: deadlineText(found.deadlineDays, found.deadlinePhrase) }] : []),
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

          {found.lines.every((l) => l.matchClass !== 'strong') && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-[#fdf6ea] px-3 py-2.5 text-[12px] leading-snug text-ink-700 ring-1 ring-inset ring-caution-500/25">
              <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution-600" />
              <span>Nothing in Field’s catalogue matches this exactly. These are the closest records; Field will confirm what fits.</span>
            </p>
          )}
          <ul className="space-y-2.5">
            {found.lines.map((l) => {
              const on = basket.includes(l.line);
              const isOpen = open === l.line;
              return (
                <li key={l.line} className={`overflow-hidden rounded-xl border bg-white transition-all ${on ? 'border-signal-600/60 shadow-[0_8px_20px_-14px_rgba(3,70,148,0.5)]' : 'border-ink-200'}`}>
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
                        on ? 'bg-signal-50 text-signal-700 ring-1 ring-inset ring-signal-600/30 hover:bg-white' : 'bg-signal-600 text-white hover:bg-signal-500'
                      }`}
                    >
                      {on ? <><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">In basket</span></> : <><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Add to basket</span></>}
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
            {!chosen.length && <p className="px-4 py-3 text-[11.5px] text-ink-400">Nothing yet. Add the parts you want quoted.</p>}
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
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[3px] bg-action-600 text-[13px] font-bold text-white transition-colors hover:bg-action-400 disabled:opacity-40"
                >
                  Request a Quote <ArrowRight className="h-4 w-4" />
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
                        <button
                          key={n}
                          // Fills both fields: the address matches the synthetic correspondence on file.
                          onClick={() => onForm({ email: validEmail(form.email) ? form.email : `procurement@${slug(n)}.example`, company: n })}
                          className="rounded bg-white px-1.5 py-0.5 text-[10.5px] text-signal-700 ring-1 ring-ink-200 hover:ring-signal-300"
                        >
                          {n}
                        </button>
                      ))}
                    </span>
                  </div>
                  <button
                    onClick={onSend}
                    disabled={!validEmail(form.email) || form.company.trim().length < 2}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-action-600 text-[13px] font-medium text-white transition-colors hover:bg-action-400 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Send to Field
                  </button>
                  <p className="text-center text-[10.5px] text-ink-400">Mock-up: nothing leaves this browser tab.</p>
                </div>
              )}
            </div>
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

function Sent({ sent, chosen, channel }: { sent: { email: string; company: string; reference: string }; chosen: SimLine[]; channel: Channel }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-strong-600" strokeWidth={1.6} />
        <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-ink-950">{channel === 'email' ? 'Email sent' : 'Request sent'}</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          {channel === 'email'
            ? `Your email reached Field’s desk. ${chosen.length} ${chosen.length === 1 ? 'part was' : 'parts were'} read from it and matched to the catalogue.`
            : `Thank you. Field has your request for ${chosen.length} ${chosen.length === 1 ? 'part' : 'parts'}.`}
        </p>
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
