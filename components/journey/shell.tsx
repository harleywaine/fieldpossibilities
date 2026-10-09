'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Clock, FileSearch, ListChecks, Lock, RotateCcw, UserRound,
  Building2, Search, Sparkles, MessageSquareText, Inbox, Wrench, Truck, Factory, Info, X,
} from 'lucide-react';
import { STEPS, AI_USES, ESTIMATE_NOTES, formatMinutes, type JourneyStep, type StepMetric } from '@/lib/journey.ts';
import { Avatar } from '@/components/journey/ui.tsx';
import { FieldLogo, FieldWordmark, PHOTOS } from '@/components/journey/brand.tsx';
import { ModuleDialog, type ModuleId } from '@/components/journey/modules.tsx';

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
        <button onClick={() => go(0)} className="flex items-center gap-3 text-left" aria-label="Back to the start">
          <FieldWordmark className="h-[13px] text-signal-600" />
          <span className="hidden border-l border-ink-200 pl-3 text-[10.5px] uppercase tracking-[0.14em] text-ink-400 sm:block">AI Opportunity Lab</span>
        </button>
        <span className="ml-auto flex items-center gap-1">
          {current >= 0 && (
            <span className="mr-2 hidden rounded-full bg-ink-50 px-2.5 py-1 text-[11px] font-medium text-ink-500 sm:inline">
              Step {current + 1} of {TRACK.length}
            </span>
          )}
          {canRestart && (
            <button onClick={onRestart} aria-label="New request" className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900">
              <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New request</span>
            </button>
          )}
        </span>
      </div>

      {/* ---------------------------------------------------------- track */}
      <nav aria-label="Journey" className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-8">
        <div className="mb-1.5 hidden gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] sm:grid" style={{ gridTemplateColumns: `${customerCount}fr ${TRACK.length - customerCount}fr` }}>
          <span className={current >= 0 && current < customerCount ? 'text-[#0284c7]' : 'text-ink-300'}>The customer’s side</span>
          <span className={current >= customerCount ? 'text-signal-600' : 'text-ink-300'}>Inside Field</span>
        </div>
        <ol className="grid gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `repeat(${TRACK.length}, minmax(0, 1fr))` }}>
          {TRACK.map((s, t) => {
            const i = STEPS.indexOf(s);
            const locked = i > reachable;
            const done = i < index;
            const now = i === index;
            return (
              <li key={s.id} className={t === customerCount ? 'ml-1.5 sm:ml-2' : ''}>
                <button
                  onClick={() => !locked && go(i)}
                  disabled={locked}
                  aria-current={now ? 'step' : undefined}
                  title={locked ? `${s.rail}: not reached yet` : s.rail}
                  className="group block w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-[3px] rounded-full transition-colors duration-500 ${
                    now ? (s.side === 'customer' ? 'bg-[#0284c7]' : 'bg-signal-700') : done ? (s.side === 'customer' ? 'bg-[#7dd3fc]' : 'bg-signal-400') : 'bg-ink-100'
                  } ${!locked && !now ? 'group-hover:bg-signal-300' : ''}`} />
                  <span className="mt-1.5 hidden items-center gap-1 text-[11px] leading-none md:flex">
                    <span className={`truncate ${now ? 'font-semibold text-ink-950' : done ? 'text-ink-600' : 'text-ink-300'}`}>{s.rail}</span>
                    {s.human && <UserRound className={`h-3 w-3 shrink-0 ${now || done ? 'text-caution-500' : 'text-caution-500/40'}`} strokeWidth={2.4} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {current >= 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] md:hidden">
            <span className="font-semibold text-ink-950">{TRACK[current]!.rail}</span>
            {TRACK[current]!.human && <UserRound className="h-3 w-3 text-caution-500" strokeWidth={2.4} />}
            <span className="text-ink-400">· {TRACK[current]!.side === 'customer' ? 'the customer' : 'Field'}</span>
            <span className="ml-auto text-[11px] text-ink-400">{current + 1} of {TRACK.length}</span>
          </p>
        )}
      </nav>
    </header>
  );
}

/* --------------------------------------------------------------- narration */

export interface Halt { done: boolean; text: React.ReactNode }

export function Narration({
  step, index, title, sub, persona, halt, eyebrow, tone = 'light', onChangePersona,
}: {
  step: JourneyStep; index: number; title: React.ReactNode; sub?: React.ReactNode;
  persona?: { name: string; role: string }; halt?: Halt; eyebrow?: string;
  /** Dark when the narration sits on Field's navy band. */
  tone?: 'light' | 'dark';
  /** On the customer's side, lets the viewer go back and play someone else. */
  onChangePersona?: () => void;
}) {
  const dark = tone === 'dark';
  const pill = dark
    ? 'bg-white/10 text-white ring-1 ring-white/15'
    : 'bg-white text-ink-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-ink-100';
  return (
    <section className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {step.side && (
          <p className="enter flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.14em] ${
              step.side === 'customer' ? 'bg-[#0369a1] text-white' : 'bg-white text-signal-800'
            }`}>
              {step.side === 'customer' ? <UserRound className="h-3.5 w-3.5" strokeWidth={2.6} /> : <Building2 className="h-3.5 w-3.5" strokeWidth={2.4} />}
              {step.side === 'customer' ? 'The customer’s side' : 'Inside Field'}
            </span>
          </p>
        )}
        {eyebrow && (
          <p className={`enter inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-medium ${pill}`}>
            <Sparkles className="h-3 w-3 text-signal-500" /> {eyebrow}
          </p>
        )}
        <h1 className={`enter mt-3 max-w-3xl font-display text-[29px] font-light sm:mt-4 leading-[1.08] tracking-[-0.02em] sm:text-[44px] ${dark ? 'text-white' : 'text-ink-950'}`} style={{ animationDelay: '80ms' }}>
          {title}
        </h1>
        {sub && (
          <p className={`enter mt-2.5 max-w-2xl text-[15px] leading-relaxed sm:mt-3 sm:text-[18px] ${dark ? 'text-signal-100/75' : 'text-ink-500'}`} style={{ animationDelay: '180ms' }}>
            {sub}
          </p>
        )}
      </div>
      {persona && <PersonaCard persona={persona} halt={halt} kind={step.side ?? 'field'} onChange={onChangePersona} />}
    </section>
  );
}

/** The same card on both sides: who you are playing, and whether this step is waiting on you. */
function PersonaCard({ persona, halt, kind, onChange }: { persona: { name: string; role: string }; halt?: Halt; kind: 'customer' | 'field'; onChange?: () => void }) {
  const waiting = halt && !halt.done;
  const customer = kind === 'customer';
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
        <span className="hidden font-medium normal-case tracking-normal opacity-80 sm:inline">{waiting ? 'The process has stopped' : 'The process can continue'}</span>
      </div>
      <div className="flex items-center gap-3 px-4 pt-3">
        <Avatar name={persona.name} size={34} square={customer} you={!customer} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[11px] text-ink-400">{customer ? 'You are playing' : 'You are signed in as'}</span>
          <span className="block truncate text-[14px] font-semibold text-ink-950">{persona.name}</span>
          <span className="block text-[12px] text-ink-500">{persona.role}</span>
        </span>
        {onChange && (
          <button onClick={onChange} className="shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-signal-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-25">
            Change
          </button>
        )}
      </div>
      <p className="px-4 pb-3.5 pt-2.5 text-[12.5px] leading-relaxed text-ink-600">
        {halt ? halt.text : 'The system found nothing that needs this person at this step.'}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- handover */

/** The one moment the viewer changes seat: the request leaves the customer and the story moves inside Field. */
export function Handover({ company, onNext }: { company: string; onNext: () => void }) {
  return (
    <section className="enter relative mt-8 overflow-hidden rounded-[28px] bg-signal-900 text-white sm:mt-10" style={{ animationDelay: '320ms' }}>
      <img src={PHOTOS.sites.poole} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full object-cover object-center opacity-50" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(2,25,58,0.98)_0%,rgba(2,25,58,0.92)_52%,rgba(2,25,58,0.4)_100%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,25,58,0.55)_0%,rgba(2,25,58,0)_60%)]" />
      <div className="relative max-w-2xl px-6 py-12 sm:px-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7EA7D7]">Now switch sides</p>
        <h2 className="mt-3 font-display text-[32px] font-light leading-[1.05] tracking-[-0.02em] text-white sm:text-[48px]">
          Your request has left the building.
          <span className="block text-[#7EA7D7]">Now you’re at Field.</span>
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-signal-100/75 sm:text-[17px]">
          Everything from here is inside Field’s own system in Poole, Dorset. {company}’s request arrives before anyone has opened it.
        </p>
        <button
          onClick={onNext}
          className="mt-7 inline-flex h-12 items-center gap-2.5 rounded-[3px] bg-action-600 px-6 text-[14px] font-bold text-white shadow-[0_16px_40px_-12px_rgba(162,18,18,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-action-400"
        >
          Open Field’s inbox <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

/** The customer's sky band behind the narration on the customer's side. */
export function CustomerBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#cfe4f7_0%,#e2eef9_100%)]">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[#0369a1]/15" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-12">{children}</div>
    </div>
  );
}

/** Field's navy band behind the narration on every step inside Field. */
export function FieldBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-signal-900">
      <img src={PHOTOS.watermark} alt="" aria-hidden draggable={false} className="pointer-events-none absolute -right-10 -top-16 w-[620px] opacity-[0.07]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,25,58,0)_0%,rgba(3,70,148,0.25)_100%)]" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- stage */

export function Stage({ children }: { children: React.ReactNode }) {
  // The mock screens carry their own edge and shadow, so they take the full container width.
  return (
    <div className="enter relative mt-6 sm:mt-8" style={{ animationDelay: '220ms' }}>
      {children}
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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-6xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-5">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-signal-900/[0.97] p-2 text-white shadow-[0_28px_60px_-24px_rgba(2,25,58,0.75)] ring-1 ring-white/10 backdrop-blur-xl sm:gap-5 sm:p-2.5">
        <button
          onClick={onBack}
          disabled={!canBack}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-25"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* phones: the one thing worth knowing — why it's locked, or the time so far */}
        <div className="min-w-0 flex-1 sm:hidden">
          {blocked || hint ? (
            <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#fcd38d]">
              <Lock className="mt-0.5 h-3 w-3 shrink-0" /><span className="line-clamp-2">{blocked ?? hint}</span>
            </p>
          ) : showLedger ? (
            <button onClick={() => setExplain(true)} className="text-left leading-tight">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40">People’s time <Info className="inline h-3 w-3" /></span>
              <span className="mono block text-[12px] text-white/60">{formatMinutes(ledger.before)} → <span className="font-medium text-white">{formatMinutes(ledger.after)}</span></span>
            </button>
          ) : null}
        </div>

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
              className="group inline-flex h-11 items-center gap-2 rounded-xl bg-white pl-4 pr-3.5 text-[13px] font-semibold sm:h-10 text-[#0a1a2f] shadow-[0_1px_0_rgba(255,255,255,0.4)_inset] transition-all hover:bg-signal-50 disabled:bg-white/10 disabled:text-white/35"
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

export interface CatalogueFacts { products: number; withImages: number; withLeadTime: number; withApplicability: number; aircraftModels: number }

/** The landing: one full-screen scene, nothing else on it until the viewer begins. */
export function Cover({ onBegin, catalogue }: { onBegin: () => void; catalogue: CatalogueFacts | null }) {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-signal-900 text-white">
      {/* Field's own hero photograph: a 777 on approach, under a brand-navy wash that clears the left for the words. */}
      <img
        src={PHOTOS.hero777}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[70%_40%]"
        style={{ animation: 'heroDrift 28s ease-in-out infinite alternate' }}
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(2,25,58,0.96)_0%,rgba(2,25,58,0.88)_38%,rgba(3,70,148,0.45)_70%,rgba(2,25,58,0.35)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(2,25,58,0.9))]" />
      <header className="enter relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 sm:px-8 sm:pt-7">
        <FieldLogo tone="white" className="h-[64px] sm:h-[92px]" />
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 sm:px-8">
        <div className="max-w-[36rem] py-14">
          <h1 className="enter font-display text-[42px] font-light leading-[1.02] tracking-[-0.025em] text-white sm:text-[68px]" style={{ animationDelay: '200ms' }}>
            Follow one enquiry from the customer to the factory.
          </h1>
          <p className="enter mt-6 max-w-[32rem] text-[16px] leading-relaxed text-signal-100/70 sm:text-[18px]" style={{ animationDelay: '320ms' }}>
            Built on Field’s own published catalogue: {catalogue ? catalogue.products.toLocaleString() : '8,316'} parts, from the 707 to the 787,
            read the way a customer describes a job. Play the customer, then the people at Poole who
            handle the enquiry. The system does the preparation. You make the decisions.
          </p>
          <div className="enter mt-9 flex flex-wrap items-center gap-5" style={{ animationDelay: '440ms' }}>
            <button
              onClick={onBegin}
              autoFocus
              className="group inline-flex h-13 items-center gap-2.5 rounded-[3px] bg-action-600 px-7 text-[15px] font-bold text-white shadow-[0_16px_40px_-12px_rgba(162,18,18,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-action-400 hover:shadow-[0_22px_48px_-12px_rgba(162,18,18,0.8)] active:translate-y-0"
            >
              Begin <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      <footer className="enter relative z-10 mx-auto w-full max-w-6xl px-5 pb-7 sm:px-8 sm:pb-9" style={{ animationDelay: '600ms' }}>
        <div className="flex flex-col gap-2 border-t border-white/10 pt-5 text-[12px] text-white/50 sm:flex-row sm:gap-8">
          {[
            { dot: 'bg-strong-500', t: 'Real', d: 'Field’s published catalogue' },
            { dot: 'bg-caution-500', t: 'Synthetic', d: 'customers, staff, suppliers and prices' },
            { dot: 'bg-[#8b5cf6]', t: 'Simulated', d: 'supplier replies and orders' },
          ].map((x) => (
            <span key={x.t} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${x.dot}`} />
              <span className="font-medium text-white/80">{x.t}</span> {x.d}
            </span>
          ))}
        </div>
      </footer>
    </section>
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
  const [mock, setMock] = useState<ModuleId | null>(null);
  // Each step's saving at its own assumed yearly volume, so this agrees with the table below.
  const hoursPerYear = Math.round(rows.reduce((a, r) => a + (r.before - r.after) * r.volume, 0) / 60);
  const pct = before ? Math.round((saved / before) * 100) : 0;
  const stats = [
    { icon: FileSearch, v: considered.toLocaleString(), t: 'catalogue records searched' },
    { icon: Building2, v: docs ? String(docs) : '–', t: 'internal documents read' },
    { icon: ListChecks, v: String(checks), t: 'checks run on the lines' },
    { icon: UserRound, v: String(decisions), t: 'decisions made by you', you: true },
  ];
  return (
    <div className="space-y-5">
      {mock && <ModuleDialog id={mock} onClose={() => setMock(null)} />}
      <section
        className="enter relative overflow-hidden rounded-[24px] bg-signal-900 px-6 py-9 text-white sm:rounded-[32px] sm:px-12 sm:py-14"
        style={{ backgroundImage: 'radial-gradient(60% 80% at 90% 0%, rgba(17,96,173,0.5), transparent 70%)' }}
      >
        {/* Field's globe watermark, as on the dark bands of their own site. */}
        <img src={PHOTOS.watermark} alt="" aria-hidden draggable={false} className="pointer-events-none absolute -right-10 -top-6 w-[520px] opacity-[0.07]" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal-300">One enquiry, start to finish</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="font-display text-[44px] font-medium leading-none tracking-[-0.04em] sm:text-[64px]">
              {formatMinutes(after)}
            </p>
            <p className="mt-3 text-[15px] text-signal-100/70">
              of people’s time with AI, against <span className="text-white">{formatMinutes(before)}</span> today,{' '}
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
                <th className="py-2 font-semibold">Step</th><th className="text-right font-semibold sm:hidden">Time</th><th className="hidden text-right font-semibold sm:table-cell">Today</th><th className="hidden text-right font-semibold sm:table-cell">With AI</th><th className="text-right font-semibold">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-2.5 text-ink-800">{r.label}</td>
                  <td className="mono whitespace-nowrap text-right text-ink-500 sm:hidden">{r.before} → <span className="text-ink-900">{r.after}</span></td>
                  <td className="mono hidden text-right text-ink-400 sm:table-cell">{r.before} min</td>
                  <td className="mono hidden text-right text-ink-900 sm:table-cell">{r.after} min</td>
                  <td className="mono whitespace-nowrap text-right text-strong-600">−{r.before - r.after} min</td>
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
            Every figure here is an estimate, not a measurement. See{' '}
            <a href="#estimates" className="text-signal-600 underline decoration-signal-200 underline-offset-[3px] hover:text-signal-800">how they were made</a>.
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <button onClick={onRestart} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0a1a2f] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-signal-800">
              <RotateCcw className="h-4 w-4" /> Try another request
            </button>
          </div>
        </section>
      </div>

      <WhatIf rows={rows} />

      <section id="estimates" className="enter scroll-mt-32 rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-7" style={{ animationDelay: '560ms' }}>
        <h2 className="mb-4 font-display text-[22px] font-medium tracking-[-0.03em] text-ink-950">Where the time estimates come from</h2>
        <Estimates rows={rows} />
      </section>

      <section className="enter rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-7" style={{ animationDelay: '580ms' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal-500">Where this goes next</p>
        <h2 className="mt-2 font-display text-[22px] font-medium tracking-[-0.03em] text-ink-950">One enquiry is the spine. These hang off it.</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
          The same system of record, the same catalogue and the same people. Each needs one more source of Field’s own data, named on the card.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEXT_USES.map((u, i) => (
            <li key={u.title} className="flex flex-col rounded-xl bg-ink-25 p-4 ring-1 ring-ink-100">
              <span className="mono text-[11px] text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              <p className="mt-2 text-[13.5px] font-semibold leading-snug tracking-tight text-ink-950">{u.title}</p>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-600">{u.does}</p>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                <span className={`rounded-md px-1.5 py-0.5 font-medium ${u.data === 'public' ? 'bg-strong-600/[0.08] text-strong-600' : 'bg-caution-500/[0.1] text-caution-600'}`}>{u.needs}</span>
                <span className="rounded-md bg-white px-1.5 py-0.5 font-medium text-ink-500 ring-1 ring-ink-100">{u.who}</span>
                {u.mock && (
                  <button onClick={() => setMock(u.mock!)} className="ml-auto inline-flex items-center gap-1 rounded-md bg-signal-600 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-signal-500">
                    See the screen <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="enter flex items-start gap-2.5 px-1 text-[13px] leading-relaxed text-ink-500" style={{ animationDelay: '600ms' }}>
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" />
        Everything you’ve just used was built from Field’s public catalogue alone. When you want it pointed at the
        real thing, reply to the message this link arrived in.
      </p>
    </div>
  );
}

/**
 * The viewer's own numbers. Three dials the board will reach for: how many
 * enquiries a year, what an hour of people's time costs, and how much of the
 * work the system actually touches. Hours are the unit; money follows hours,
 * and capacity is named as capacity, not cash.
 */
function WhatIf({ rows }: { rows: EstimateRow[] }) {
  const [scale, setScale] = useState(1);
  const [rate, setRate] = useState(63);
  const [adoption, setAdoption] = useState(75);
  const enquiries = Math.round(Math.max(...rows.map((r) => r.volume)) * scale);
  const hours = Math.round(rows.reduce((a, r) => a + (r.before - r.after) * r.volume * scale, 0) / 60 * (adoption / 100));
  const fte = Math.round((hours / 1650) * 10) / 10;
  const value = hours * rate;
  const cash = Math.round(value * 0.3);
  const money = (n: number) => `£${Math.round(n / 1000).toLocaleString()}k`;
  return (
    <section className="enter rounded-2xl bg-white p-5 ring-1 ring-ink-100 sm:p-7" style={{ animationDelay: '540ms' }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal-500">Make the numbers yours</p>
          <h2 className="mt-2 font-display text-[22px] font-medium tracking-[-0.03em] text-ink-950">Three dials, and the whole year moves.</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            The step times stay as estimated above. These are the figures Field knows and we don’t.
          </p>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Enquiries a year', value: enquiries.toLocaleString(), min: 0.25, max: 3, step: 0.25, v: scale, set: setScale, note: `${scale}× the assumed volumes` },
              { label: 'Loaded cost of an hour', value: `£${rate}`, min: 40, max: 120, step: 1, v: rate, set: setRate, note: 'salary, employer costs and overhead' },
              { label: 'Share of the work the system touches', value: `${adoption}%`, min: 25, max: 100, step: 5, v: adoption, set: setAdoption, note: 'not every enquiry will go through it' },
            ].map((d) => (
              <label key={d.label} className="block">
                <span className="flex items-baseline justify-between text-[12.5px]">
                  <span className="font-medium text-ink-800">{d.label}</span>
                  <span className="mono font-medium text-ink-950">{d.value}</span>
                </span>
                <input type="range" min={d.min} max={d.max} step={d.step} value={d.v} onChange={(e) => d.set(Number(e.target.value))} className="mt-1.5 w-full" aria-label={d.label} />
                <span className="block text-[11px] text-ink-400">{d.note}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            { v: hours.toLocaleString(), t: 'hours of people’s time a year' },
            { v: String(fte), t: 'full-time people, at 1,650 productive hours each' },
            { v: money(value), t: 'of capacity, at your hourly cost' },
            { v: money(cash), t: 'if 30% of that capacity turns into cash or growth' },
          ].map((s, i) => (
            <div key={s.t} className={`rounded-2xl p-4 ring-1 ${i === 0 ? 'bg-[#07162a] text-white ring-transparent' : 'bg-ink-25 ring-ink-100'}`}>
              <p className={`font-display text-[28px] font-medium leading-none tracking-[-0.03em] ${i === 0 ? 'text-white' : 'text-ink-950'}`}>{s.v}</p>
              <p className={`mt-1.5 text-[12px] leading-snug ${i === 0 ? 'text-signal-100/70' : 'text-ink-500'}`}>{s.t}</p>
            </div>
          ))}
          <p className="col-span-2 text-[11.5px] leading-relaxed text-ink-400">
            Capacity is not a saving until someone decides what to do with it: more quotes out of the same team, faster replies, or a hire not made. The 30% is a placeholder for that decision, not a forecast.
          </p>
        </div>
      </div>
    </section>
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

/* ------------------------------------------------------------- what's next */

/**
 * The uses that hang off the enquiry spine once it exists. Each names the one
 * extra source of Field's own data it would need, so nobody mistakes a
 * possibility for a finding.
 */
const NEXT_USES: Array<{ title: string; does: string; needs: string; who: string; data: 'public' | 'internal'; mock?: ModuleId }> = [
  {
    title: 'The part-finder on fieldinternational.com',
    does: 'Steps 1 and 2 of this journey on the live site. Tested on 27 realistic searches, the site’s current search returned nothing for 12 of them; this found relevant parts for 24.',
    needs: 'Public catalogue only', who: 'Customers', data: 'public',
  },
  {
    title: 'Every RFQ logged, from any inbox',
    does: 'Enquiries that arrive at salesuk@, salespte@, salesme@, salesin@ or salesna@ become enquiries before anyone opens them: part lists read from PDFs and spreadsheets, account matched, owner assigned, clock started. You can send one by email at the start of this journey.',
    needs: 'Microsoft 365 mailboxes', who: 'Sales desks', data: 'internal',
  },
  {
    title: 'Who to call before Pensacola opens',
    does: 'Operators and MROs whose fleets match Field’s catalogue but who aren’t customers, by region, with the news that makes a call timely. First list: the US order book for January 2027.',
    needs: 'Public fleet data', who: 'Business development', data: 'public', mock: 'prospects',
  },
  {
    title: 'Calibration and recertification recall',
    does: 'Every tool Field has calibrated or proof-loaded has a due date. A reminder and a ready quote at 60 and 30 days turns a certificate expiry into a booking instead of a lapse.',
    needs: 'Calibration records', who: 'Service revenue', data: 'internal', mock: 'recall',
  },
  {
    title: 'One pipeline across seven companies',
    does: 'Enquiries in, quotes out, value open, response times and late lines for the group on one screen, and a Monday digest written by the system for the board.',
    needs: 'The enquiry system', who: 'The board', data: 'internal', mock: 'pipeline',
  },
  {
    title: 'A customer portal',
    does: 'Quote status, order tracking, certificates to download, reorders and RFQ history, backed by the same records. Fewer “where is my order” emails, and a reason to come back.',
    needs: 'Orders and certificates', who: 'Customers', data: 'internal',
  },
];

/* -------------------------------------------------------------- AI uses */

const USE_ICON: Partial<Record<string, typeof Search>> = {
  request: MessageSquareText, parts: Search, inbox: Inbox, account: Sparkles,
  check: ListChecks, review: Wrench, supplier: Truck, manufacture: Factory,
};

export function AiUses({ catalogue }: { catalogue: CatalogueFacts | null }) {
  const people = [
    { who: 'Engineering', what: 'judges whether a part fits' },
    { who: 'Supply planning', what: 'confirms where each line is made or bought' },
    { who: 'Commercial', what: 'sets prices and signs off the quote' },
    { who: 'Operations', what: 'decides what to do about late lines' },
  ];
  return (
    <div className="enter mt-8 space-y-4" style={{ animationDelay: '220ms' }}>
      {/* Field's own photograph: FIL landing-gear trolleys in a customer's hangar. */}
      <figure className="relative h-44 overflow-hidden rounded-2xl ring-1 ring-ink-100 sm:h-56">
        <img src={PHOTOS.products} alt="Field International landing-gear trolleys in a maintenance hangar" draggable={false} className="absolute inset-0 h-full w-full object-cover object-[50%_60%]" />
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,25,58,0.85)_0%,rgba(2,25,58,0.35)_55%,transparent_100%)]" />
        <figcaption className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center px-6 text-white sm:px-8">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-signal-200">The job this is built around</span>
          <span className="mt-1.5 font-display text-[20px] font-light leading-snug sm:text-[24px]">A customer needs tooling. Nine moments between their request and your factory.</span>
        </figcaption>
      </figure>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AI_USES.map((u, i) => {
          const Icon = USE_ICON[u.step] ?? Sparkles;
          const step = STEPS.find((s) => s.id === u.step);
          return (
            <li key={u.title} className="enter flex flex-col rounded-2xl bg-white p-4 ring-1 sm:p-5 ring-ink-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)]" style={{ animationDelay: `${260 + i * 60}ms` }}>
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-signal-50 text-signal-600">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="mono text-[11px] text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <p className="mt-3 text-[14px] font-semibold leading-snug tracking-tight text-ink-950 sm:mt-4">{u.title}</p>
              <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-ink-500">{u.does}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3 text-[10.5px] sm:mt-4">
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
            {catalogue?.withApplicability !== undefined && (
              <li>
                {catalogue.withApplicability.toLocaleString()} of those records say which variants they fit, in the description
                (“737-600, 700, 800, 900”). The site’s own search doesn’t read that line; this does.
              </li>
            )}
            <li>What Field supplies: Boeing-licensed aircraft tooling and ground support equipment, made in the UK, Singapore, China and India, for airlines, MROs and OEMs.</li>
          </ul>
        </div>
        <div className="bg-white p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-950"><span className="h-2 w-2 rounded-full bg-caution-500" />What we’ve assumed</p>
          <ul className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-ink-600">
            <li>How an enquiry moves inside Field: who handles it, in what order, in which systems. We haven’t seen Field’s internal systems.</li>
            <li>The customers, their history, the staff and the suppliers. All synthetic, made up for this demo.</li>
            <li>Every price, cost and margin. Field publishes no prices, so the pricing step uses invented ones, marked on every screen.</li>
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

      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.process} className="rounded-xl p-3.5 ring-1 ring-ink-100">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink-900">{r.label}</p>
              <p className="mono shrink-0 text-[12px] text-ink-500">{r.before} → <span className="font-medium text-ink-900">{r.after} min</span></p>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-ink-600"><span className="text-ink-400">Today: </span>{ESTIMATE_NOTES[r.process]?.today}</p>
            <p className="mt-1 text-[12px] leading-snug text-ink-600"><span className="text-ink-400">With AI: </span>{ESTIMATE_NOTES[r.process]?.withAi}</p>
            <p className="mt-1.5 text-[11px] text-ink-400">Assumed {r.volume.toLocaleString()} times a year</p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl ring-1 ring-ink-100 sm:block">
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
        Time a sample of real enquiries at each step, or take the times from Field’s email and order systems, and
        replace these figures with them. Every number here comes from one table, so the whole journey updates.
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#07162a]/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Where the time estimates come from"
        onClick={(e) => e.stopPropagation()}
        className="step-in max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_40px_80px_-30px_rgba(4,24,47,0.6)] sm:rounded-2xl sm:p-8"
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
