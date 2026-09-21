'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Clock, FileSearch, ListChecks, Lock, RotateCcw, UserRound,
  Building2, Search, Sparkles, MessageSquareText, Inbox, Wrench, Truck, Factory, Info, X,
} from 'lucide-react';
import { STEPS, AI_USES, ESTIMATE_NOTES, formatMinutes, type JourneyStep, type StepMetric } from '@/lib/journey.ts';
import { Avatar } from '@/components/journey/ui.tsx';

/*
 * The frame around the story: the bar at the top, the narration, the stage the
 * mock-ups sit on, and the dock at the bottom. Everything a viewer needs to
 * move through the journey lives in the dock; everything they operate lives on
 * the stage.
 */

const TRACK = STEPS.filter((s) => s.side);
const trackIndex = (i: number) => TRACK.findIndex((s) => s.id === STEPS[i]?.id);

/* ----------------------------------------------------------------- top bar */

export function TopBar({
  index, reachable, go, onRestart, canRestart,
}: { index: number; reachable: number; go: (i: number) => void; onRestart: () => void; canRestart: boolean }) {
  const current = trackIndex(index);
  const customerCount = TRACK.filter((s) => s.side === 'customer').length;
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-8">
        <button onClick={() => go(0)} className="flex items-center gap-2.5 text-left" aria-label="Back to the start">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <span className="h-2 w-2 rotate-45 bg-white" />
          </span>
          <span className="leading-none">
            <span className="block text-[13px] font-semibold tracking-tight text-ink-950">Field</span>
            <span className="block text-[10.5px] text-ink-400">Enquiry simulation</span>
          </span>
        </button>
        <span className="ml-auto flex items-center gap-1">
          {current >= 0 && (
            <span className="mr-2 hidden rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-500 sm:inline">
              Step {current + 1} of {TRACK.length}
            </span>
          )}
          {canRestart && (
            <button onClick={onRestart} className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900">
              <RotateCcw className="h-3.5 w-3.5" /> New request
            </button>
          )}
          <Link href="/demos" className="flex h-8 items-center rounded-lg px-2.5 text-[12px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900">
            All demos
          </Link>
        </span>
      </div>

      {/* ---------------------------------------------------------- track */}
      <nav aria-label="Journey" className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-8">
        <div className="mb-1.5 grid gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ gridTemplateColumns: `${customerCount}fr ${TRACK.length - customerCount}fr` }}>
          <span className={current >= 0 && current < customerCount ? 'text-signal-600' : 'text-ink-300'}>The customer</span>
          <span className={current >= customerCount ? 'text-signal-600' : 'text-ink-300'}>Field</span>
        </div>
        <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${TRACK.length}, minmax(0, 1fr))` }}>
          {TRACK.map((s, t) => {
            const i = STEPS.indexOf(s);
            const locked = i > reachable;
            const done = i < index;
            const now = i === index;
            return (
              <li key={s.id} className={t === customerCount ? 'ml-2' : ''}>
                <button
                  onClick={() => !locked && go(i)}
                  disabled={locked}
                  aria-current={now ? 'step' : undefined}
                  title={locked ? `${s.rail} — not reached yet` : s.rail}
                  className="group block w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-[3px] rounded-full transition-colors duration-500 ${
                    now ? 'bg-signal-700' : done ? 'bg-signal-400' : 'bg-ink-100'
                  } ${!locked && !now ? 'group-hover:bg-signal-300' : ''}`} />
                  <span className={`mt-1.5 flex items-center gap-1 text-[11px] leading-none ${now ? 'flex' : 'hidden md:flex'}`}>
                    <span className={`truncate ${now ? 'font-semibold text-ink-950' : done ? 'text-ink-600' : 'text-ink-300'}`}>{s.rail}</span>
                    {s.human && <UserRound className={`h-3 w-3 shrink-0 ${now || done ? 'text-caution-500' : 'text-caution-500/40'}`} strokeWidth={2.4} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}

/* --------------------------------------------------------------- narration */

export interface Halt { done: boolean; text: React.ReactNode }

export function Narration({
  step, index, title, sub, persona, halt, eyebrow,
}: {
  step: JourneyStep; index: number; title: React.ReactNode; sub?: React.ReactNode;
  persona?: { name: string; role: string }; halt?: Halt; eyebrow?: string;
}) {
  const t = trackIndex(index);
  return (
    <section className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {step.side && (
          <p className="enter inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-ink-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-ink-100">
            <span className={`h-1.5 w-1.5 rounded-full ${step.side === 'customer' ? 'bg-[#38bdf8]' : 'bg-signal-600'}`} />
            <span className="mono text-ink-400">{String(t + 1).padStart(2, '0')}</span>
            {step.side === 'customer' ? 'The customer · Field’s website' : 'Field · the CRM'}
          </p>
        )}
        {eyebrow && (
          <p className="enter inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11.5px] font-medium text-ink-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-ink-100">
            <Sparkles className="h-3 w-3 text-signal-500" /> {eyebrow}
          </p>
        )}
        <h1 className="enter mt-4 max-w-3xl font-display text-[32px] font-medium leading-[1.06] tracking-[-0.035em] text-ink-950 sm:text-[44px]" style={{ animationDelay: '80ms' }}>
          {title}
        </h1>
        {sub && (
          <p className="enter mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-500 sm:text-[18px]" style={{ animationDelay: '180ms' }}>
            {sub}
          </p>
        )}
      </div>
      {persona && <PersonaCard persona={persona} halt={halt} />}
    </section>
  );
}

function PersonaCard({ persona, halt }: { persona: { name: string; role: string }; halt?: Halt }) {
  const waiting = halt && !halt.done;
  return (
    <div
      className={`enter overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_-18px_rgba(4,24,47,0.35)] ring-1 ${waiting ? 'ring-caution-500/40' : 'ring-ink-100'}`}
      style={{ animationDelay: '260ms' }}
    >
      <div className={`flex items-center justify-between px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${
        waiting ? 'bg-[#fdf5e7] text-caution-600' : halt ? 'bg-[#ecf7f1] text-strong-600' : 'bg-ink-25 text-ink-400'
      }`}>
        <span className="flex items-center gap-2">
          {waiting ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caution-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-caution-500" />
            </span>
          ) : halt ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          {waiting ? 'Your decision' : halt ? 'Decided' : 'Nothing to decide'}
        </span>
        <span className="font-medium normal-case tracking-normal opacity-80">{waiting ? 'The process has stopped' : 'The process can continue'}</span>
      </div>
      <div className="flex items-center gap-3 px-4 pt-3.5">
        <Avatar name={persona.name} size={38} you />
        <span className="leading-tight">
          <span className="block text-[11px] text-ink-400">You are signed in as</span>
          <span className="block text-[14px] font-semibold text-ink-950">{persona.name}</span>
          <span className="block text-[12px] text-ink-500">{persona.role}</span>
        </span>
      </div>
      <p className="px-4 pb-4 pt-3 text-[12.5px] leading-relaxed text-ink-600">
        {halt ? halt.text : 'The system found nothing that needs this person at this step.'}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- stage */

export function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="enter relative mt-8 rounded-[28px] p-2 ring-1 ring-ink-100 sm:p-5 lg:p-7"
      style={{
        animationDelay: '220ms',
        background: 'radial-gradient(120% 80% at 50% 0%, #ffffff 0%, #eef2f8 55%, #e6ecf5 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-60"
        style={{
          backgroundImage: 'radial-gradient(rgba(4,35,72,0.10) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(90% 70% at 50% 100%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(90% 70% at 50% 100%, black, transparent)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------- dock */

export interface Ledger {
  totalBefore: number; before: number; after: number;
  latest: { s: JourneyStep; m: StepMetric } | null;
}

export function Dock({
  canBack, onBack, onNext, cta, blocked, hint, ledger, showLedger, estimates,
}: {
  canBack: boolean; onBack: () => void; onNext?: () => void; cta: string;
  blocked?: string; hint?: string; ledger: Ledger; showLedger: boolean; estimates: EstimateRow[];
}) {
  const [explain, setExplain] = useState(false);
  const w = (m: number) => `${Math.max(1.5, (m / ledger.totalBefore) * 100)}%`;
  return (
    <>
    {explain && <EstimatesDialog rows={estimates} onClose={() => setExplain(false)} />}
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-6xl px-3 pb-3 sm:px-8 sm:pb-5">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#0a1a2f]/[0.97] p-2 text-white shadow-[0_28px_60px_-24px_rgba(4,24,47,0.75)] ring-1 ring-white/10 backdrop-blur-xl sm:gap-5 sm:p-2.5">
        <button
          onClick={onBack}
          disabled={!canBack}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="hidden min-w-0 flex-1 sm:block">
          {showLedger ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Today</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className="block h-full rounded-full bg-white/35 transition-[width] duration-700 ease-out" style={{ width: w(ledger.before) }} />
              </span>
              <span className="mono w-20 text-right text-[12px] text-white/60">{formatMinutes(ledger.before)}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-signal-300">With AI</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span className="block h-full rounded-full bg-gradient-to-r from-signal-400 to-[#7dd3fc] transition-[width] duration-700 ease-out" style={{ width: w(ledger.after) }} />
              </span>
              <span className="mono w-20 text-right text-[12px] font-medium text-white">{formatMinutes(ledger.after)}</span>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-[12px] text-white/50">
              <Clock className="h-3.5 w-3.5" /> People’s time is counted from the moment the enquiry reaches Field.
            </p>
          )}
        </div>

        <button
          onClick={() => setExplain(true)}
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] text-white/55 transition-colors hover:bg-white/10 hover:text-white sm:flex"
        >
          <Info className="h-3.5 w-3.5" /> How is this estimated?
        </button>

        {showLedger && ledger.latest && (
          <p key={ledger.latest.s.id} className="step-in hidden max-w-[210px] shrink-0 border-l border-white/10 pl-4 text-[11px] leading-snug text-white/50 xl:block">
            <span className="block text-white/80">{ledger.latest.s.ledgerLabel}</span>
            {ledger.latest.m.before} min today → {ledger.latest.m.after} min with AI
          </p>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
          {(blocked || hint) && (
            <span className="hidden items-center gap-1.5 text-[12px] text-[#fcd38d] md:flex">
              <Lock className="h-3.5 w-3.5" /> {blocked ?? hint}
            </span>
          )}
          {onNext && (
            <button
              onClick={onNext}
              disabled={Boolean(blocked)}
              className="group inline-flex h-10 items-center gap-2 rounded-xl bg-white pl-4 pr-3.5 text-[13px] font-semibold text-[#0a1a2f] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] transition-all hover:bg-signal-50 disabled:bg-white/10 disabled:text-white/35"
            >
              {cta}
              <ArrowRight className="h-4 w-4 transition-transform group-enabled:group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------- cover */

export function Cover({ onBegin }: { onBegin: () => void }) {
  return (
    <div>
      <section
        className="enter relative overflow-hidden rounded-[32px] bg-[#07162a] px-6 py-12 text-white sm:px-12 sm:py-16"
        style={{
          backgroundImage:
            'radial-gradient(60% 70% at 85% 10%, rgba(17,96,173,0.55), transparent 70%), radial-gradient(40% 50% at 10% 100%, rgba(56,189,248,0.12), transparent 70%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 32px 32px, 32px 32px',
        }}
      >
        <div className="relative z-10 max-w-[34rem]">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-[11.5px] text-signal-100/80 ring-1 ring-inset ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3fc]" /> Field International · AI Opportunity Lab
          </p>
          <h1 className="mt-6 font-display text-[38px] font-medium leading-[1.02] tracking-[-0.04em] text-white sm:text-[58px]">
            Follow one enquiry from the customer to the factory.
          </h1>
          <p className="mt-5 max-w-[30rem] text-[16px] leading-relaxed text-signal-100/70 sm:text-[17px]">
            Play Field’s customer, then the people at Field who handle the enquiry. The system does the
            preparation. You make the decisions.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              onClick={onBegin}
              className="group inline-flex h-12 items-center gap-2.5 rounded-xl bg-white pl-5 pr-4 text-[14px] font-semibold text-[#07162a] shadow-[0_12px_30px_-10px_rgba(125,211,252,0.5)] transition-colors hover:bg-signal-50"
            >
              Begin <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <span className="flex items-center gap-4 text-[12.5px] text-signal-100/60">
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> About five minutes</span>
              <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5" /> Four points where you decide</span>
            </span>
          </div>
        </div>

        {/* two mock-ups, composed: the website in front of the CRM */}
        <div aria-hidden className="pointer-events-none absolute -right-20 top-12 hidden w-[540px] xl:block" style={{ perspective: '1400px' }}>
          <div className="relative" style={{ transform: 'rotateY(-14deg) rotateX(6deg)' }}>
            <MiniCrm />
            <div className="absolute -left-10 top-40 w-[280px]"><MiniSite /></div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { dot: 'bg-strong-500', t: 'Real', d: 'Field’s published catalogue: every part, photo, fact and lead time shown.' },
          { dot: 'bg-caution-500', t: 'Synthetic', d: 'Customers and their history, complaints, Field’s staff and suppliers.' },
          { dot: 'bg-[#8b5cf6]', t: 'Simulated', d: 'Supplier replies and the order in production.' },
        ].map((x, i) => (
          <div key={x.t} className="enter rounded-2xl bg-white p-5 ring-1 ring-ink-100" style={{ animationDelay: `${300 + i * 90}ms` }}>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-950"><span className={`h-2 w-2 rounded-full ${x.dot}`} />{x.t}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{x.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniSite() {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
      <div className="flex gap-1 bg-[#f3f5f8] px-2.5 py-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-200" />)}</div>
      <div className="bg-signal-900 px-3.5 py-4">
        <p className="text-[9px] font-semibold tracking-[0.14em] text-signal-300">FIND A PART</p>
        <p className="mt-1 text-[12px] font-semibold text-white">Tell us the job.</p>
        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-[9px] text-ink-400"><Search className="h-2.5 w-2.5" />737-800 thrust reverser…</div>
      </div>
      <div className="space-y-1.5 p-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-md p-1.5 ring-1 ring-ink-100">
            <span className="h-6 w-6 rounded bg-ink-50" />
            <span className="flex-1 space-y-1"><span className="block h-1.5 w-3/4 rounded bg-ink-100" /><span className="block h-1.5 w-1/2 rounded bg-ink-50" /></span>
            <span className="h-3.5 w-9 rounded bg-signal-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCrm() {
  return (
    <div className="flex h-[330px] overflow-hidden rounded-xl bg-[#f6f8fb] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
      <div className="w-24 space-y-2 bg-[#0a1a2f] p-2.5">
        <span className="block h-4 w-4 rounded bg-signal-500" />
        {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className={`block h-1.5 rounded ${i === 1 ? 'w-14 bg-white/50' : 'w-12 bg-white/15'}`} />)}
      </div>
      <div className="flex-1 space-y-2.5 p-3">
        <span className="block h-2.5 w-40 rounded bg-ink-200" />
        <div className="flex gap-0.5">{['bg-signal-500', 'bg-signal-500', 'bg-signal-800', 'bg-ink-100', 'bg-ink-100'].map((c, i) => <span key={i} className={`h-3 flex-1 ${c}`} />)}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => <span key={i} className="block h-9 rounded-md bg-white ring-1 ring-ink-100" />)}
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-1.5">
          <span className="block h-36 rounded-md bg-white ring-1 ring-ink-100" />
          <span className="block h-36 rounded-md bg-gradient-to-b from-[#f3f0ff] to-white ring-1 ring-[#ddd5ff]" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- results */

export function Results({
  before, after, decisions, considered, docs, checks, rows, onRestart,
}: {
  before: number; after: number; decisions: number;
  considered: number; docs: number; checks: number;
  rows: EstimateRow[];
  onRestart: () => void;
}) {
  const saved = before - after;
  // Each step's saving at its own assumed yearly volume, so this agrees with the table below.
  const hoursPerYear = Math.round(rows.reduce((a, r) => a + (r.before - r.after) * r.volume, 0) / 60);
  const pct = before ? Math.round((saved / before) * 100) : 0;
  const stats = [
    { icon: FileSearch, v: considered.toLocaleString(), t: 'catalogue records searched' },
    { icon: Building2, v: docs ? String(docs) : '—', t: 'internal documents read' },
    { icon: ListChecks, v: String(checks), t: 'checks run on the lines' },
    { icon: UserRound, v: String(decisions), t: 'decisions made by you', you: true },
  ];
  return (
    <div className="space-y-5">
      <section
        className="enter relative overflow-hidden rounded-[32px] bg-[#07162a] px-6 py-10 text-white sm:px-12 sm:py-14"
        style={{ backgroundImage: 'radial-gradient(60% 80% at 90% 0%, rgba(17,96,173,0.5), transparent 70%)' }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal-300">One enquiry, start to finish</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="font-display text-[44px] font-medium leading-none tracking-[-0.04em] sm:text-[64px]">
              {formatMinutes(after)}
            </p>
            <p className="mt-3 text-[15px] text-signal-100/70">
              of people’s time with AI, against <span className="text-white">{formatMinutes(before)}</span> today —{' '}
              <span className="text-[#7dd3fc]">{pct}% less</span>.
            </p>
          </div>
          <div className="space-y-3">
            <Bar label="Today" value={formatMinutes(before)} pct={100} cls="bg-white/30" />
            <Bar label="With AI" value={formatMinutes(after)} pct={(after / before) * 100} cls="bg-gradient-to-r from-signal-400 to-[#7dd3fc]" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ icon: Icon, v, t, you }, i) => (
          <div key={t} className={`enter rounded-2xl p-5 ring-1 ${you ? 'bg-[#fdf5e7] ring-caution-500/30' : 'bg-white ring-ink-100'}`} style={{ animationDelay: `${150 + i * 80}ms` }}>
            <Icon className={`h-4 w-4 ${you ? 'text-caution-600' : 'text-signal-500'}`} />
            <p className="mt-3 font-display text-[30px] font-medium leading-none tracking-[-0.03em] text-ink-950">{v}</p>
            <p className="mt-1.5 text-[12.5px] text-ink-500">{t}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="enter rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-6" style={{ animationDelay: '450ms' }}>
          <p className="text-[13px] font-semibold text-ink-950">Where the time goes</p>
          <table className="mt-3 w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.06em] text-ink-400">
                <th className="py-2 font-semibold">Step</th><th className="text-right font-semibold">Today</th><th className="text-right font-semibold">With AI</th><th className="text-right font-semibold">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-2.5 text-ink-800">{r.label}</td>
                  <td className="mono text-right text-ink-400">{r.before} min</td>
                  <td className="mono text-right text-ink-900">{r.after} min</td>
                  <td className="mono text-right text-strong-600">−{r.before - r.after} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="enter flex flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-6" style={{ animationDelay: '520ms' }}>
          <p className="text-[13px] font-semibold text-ink-950">Across a year</p>
          <p className="mt-3 font-display text-[36px] font-medium leading-none tracking-[-0.03em] text-ink-950">
            {hoursPerYear.toLocaleString()} <span className="text-[18px] font-normal text-ink-400">hours</span>
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">
            of people’s time a year: each step’s saving multiplied by how often that step is assumed to happen
            (from {Math.min(...rows.map((r) => r.volume)).toLocaleString()} to {Math.max(...rows.map((r) => r.volume)).toLocaleString()} times a year).
            Every figure here is an estimate, not a measurement — see{' '}
            <a href="#estimates" className="text-signal-600 underline decoration-signal-200 underline-offset-[3px] hover:text-signal-800">how they were made</a>.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <button onClick={onRestart} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0a1a2f] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-signal-800">
              <RotateCcw className="h-4 w-4" /> Try another request
            </button>
            <Link href="/demos" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-medium text-ink-800 ring-1 ring-inset ring-ink-200 transition-colors hover:bg-ink-25">
              Each demo on its own <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>

      <section id="estimates" className="enter scroll-mt-32 rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-7" style={{ animationDelay: '560ms' }}>
        <h2 className="mb-4 font-display text-[22px] font-medium tracking-[-0.03em] text-ink-950">Where the time estimates come from</h2>
        <Estimates rows={rows} />
      </section>

      <p className="enter flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-ink-500" style={{ animationDelay: '600ms' }}>
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" />
        Everything you’ve just used was built from Field’s public catalogue alone. When you want it pointed at the
        real thing, reply to the message this link arrived in.
      </p>
    </div>
  );
}

function Bar({ label, value, pct, cls }: { label: string; value: string; pct: number; cls: string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12px]">
        <span className="text-signal-100/60">{label}</span>
        <span className="mono text-white">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={`h-full rounded-full ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- AI uses */

const USE_ICON: Partial<Record<string, typeof Search>> = {
  request: MessageSquareText, parts: Search, inbox: Inbox, account: Sparkles,
  check: ListChecks, review: Wrench, supplier: Truck, manufacture: Factory,
};

export function AiUses({ catalogue }: { catalogue: { products: number; withImages: number; withLeadTime: number } | null }) {
  const people = [
    { who: 'Engineering', what: 'judges whether a part fits' },
    { who: 'Procurement', what: 'approves every supplier request' },
    { who: 'Commercial', what: 'sets prices and signs off the quote' },
    { who: 'Operations', what: 'decides what to do about late lines' },
  ];
  return (
    <div className="enter mt-8 space-y-4" style={{ animationDelay: '220ms' }}>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AI_USES.map((u, i) => {
          const Icon = USE_ICON[u.step] ?? Sparkles;
          const step = STEPS.find((s) => s.id === u.step);
          return (
            <li key={u.title} className="enter flex flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]" style={{ animationDelay: `${260 + i * 60}ms` }}>
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal-50 text-signal-600">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="mono text-[11px] text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-4 text-[14px] font-semibold leading-snug tracking-tight text-ink-950">{u.title}</p>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-500">{u.does}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3 text-[10.5px]">
                <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-medium text-ink-600">{step?.rail}</span>
                <span className={`rounded-md px-1.5 py-0.5 font-medium ${u.data === 'public' ? 'bg-strong-600/[0.08] text-strong-600' : 'bg-caution-500/[0.1] text-caution-600'}`}>
                  {u.data === 'public' ? 'Works on the public catalogue' : 'Needs Field’s own records'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-6">
        <p className="text-[13px] font-semibold text-ink-950">People stay in charge of every judgement</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {people.map((p) => (
            <p key={p.who} className="flex items-start gap-2 rounded-xl bg-[#fdf6ea] px-3 py-2.5 text-[12.5px] leading-snug text-ink-700">
              <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution-600" strokeWidth={2.4} />
              <span><span className="font-semibold text-ink-900">{p.who}</span> {p.what}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="grid gap-px overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-100 md:grid-cols-2">
        <div className="bg-white p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-950"><span className="h-2 w-2 rounded-full bg-strong-500" />What we know</p>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-600">
            <li>
              Field’s public website and catalogue
              {catalogue ? `: ${catalogue.products.toLocaleString()} products, ${catalogue.withImages.toLocaleString()} with photos, ${catalogue.withLeadTime.toLocaleString()} with a published lead time.` : '.'}
              {' '}Every part you’ll see is real.
            </li>
            <li>What Field supplies: aerospace tooling and ground support equipment, for MROs and airlines.</li>
          </ul>
        </div>
        <div className="bg-white p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-950"><span className="h-2 w-2 rounded-full bg-caution-500" />What we’ve assumed</p>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-600">
            <li>How an enquiry moves inside Field: who handles it, in what order, in which systems. We haven’t seen Field’s internal systems.</li>
            <li>The customers, their history, the staff and the suppliers. All synthetic, made up for this demo.</li>
            <li>How long each step takes today. The end of the journey explains how those estimates were made.</li>
          </ul>
        </div>
      </section>
      <p className="px-1 text-[12.5px] leading-relaxed text-ink-500">
        So read each one as a possibility to test against how Field actually works, not a finding.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- estimates */

export interface EstimateRow { process: string; label: string; before: number; after: number; volume: number }

export function Estimates({ rows }: { rows: EstimateRow[] }) {
  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-ink-600">
      <p>
        <span className="font-semibold text-ink-900">They are our assumptions, not measurements.</span>{' '}
        Nothing has been timed at Field. Each figure is our estimate of how long the task takes a person at a
        technical tooling supplier handling an enquiry by email, written into this demo when it was built.
      </p>
      <p>
        <span className="font-semibold text-ink-900">“With AI” is not zero.</span>{' '}
        It assumes the system does the preparation and a person still reads and checks the result. That checking
        time is what’s left.
      </p>
      <p>
        <span className="font-semibold text-ink-900">They will change with how Field works today.</span>{' '}
        If enquiries already arrive through a web form, logging takes less time now and there’s less to save. If
        engineers review lines in batches, or suppliers are called rather than emailed, those numbers move. The
        yearly volumes are assumptions too.
      </p>

      <div className="overflow-x-auto rounded-xl ring-1 ring-ink-100">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead>
            <tr className="bg-ink-25 text-left text-[10.5px] uppercase tracking-[0.05em] text-ink-500">
              <th className="px-3 py-2 font-semibold">Step</th>
              <th className="px-3 font-semibold">What a person does today</th>
              <th className="px-3 font-semibold">With AI</th>
              <th className="px-3 text-right font-semibold">Today</th>
              <th className="px-3 text-right font-semibold">With AI</th>
              <th className="px-3 text-right font-semibold">Per year</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 align-top">
            {rows.map((r) => (
              <tr key={r.process}>
                <td className="px-3 py-2.5 font-medium text-ink-900">{r.label}</td>
                <td className="px-3 py-2.5 text-ink-600">{ESTIMATE_NOTES[r.process]?.today}</td>
                <td className="px-3 py-2.5 text-ink-600">{ESTIMATE_NOTES[r.process]?.withAi}</td>
                <td className="mono whitespace-nowrap px-3 py-2.5 text-right text-ink-500">{r.before} min</td>
                <td className="mono whitespace-nowrap px-3 py-2.5 text-right text-ink-900">{r.after} min</td>
                <td className="mono whitespace-nowrap px-3 py-2.5 text-right text-ink-500">{r.volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-ink-500">
        Quote sign-off and the order aren’t counted: they are decisions, and they take as long as they need.
      </p>
      <p>
        <span className="font-semibold text-ink-900">How to make them real.</span>{' '}
        Time a sample of real enquiries at each step, or take the times from Field’s email and order systems, then
        put those figures into{' '}
        <Link href="/roi" className="font-medium text-signal-600 underline decoration-signal-200 underline-offset-[3px] hover:text-signal-800">the value model</Link>,
        where every number can be changed.
      </p>
    </div>
  );
}

export function EstimatesDialog({ rows, onClose }: { rows: EstimateRow[]; onClose: () => void }) {
  useEffect(() => {
    document.body.dataset.dialog = 'open';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { delete document.body.dataset.dialog; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#07162a]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Where the time estimates come from"
        onClick={(e) => e.stopPropagation()}
        className="step-in max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_40px_80px_-30px_rgba(4,24,47,0.6)] sm:p-8"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-[24px] font-medium tracking-[-0.03em] text-ink-950">Where the time estimates come from</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-900">
            <X className="h-4 w-4" />
          </button>
        </div>
        <Estimates rows={rows} />
      </div>
    </div>
  );
}
