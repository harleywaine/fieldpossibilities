'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  STEPS, CUSTOMER_QUERY, RESEARCH_QUESTION, formatMinutes, type StepId, type StepMetric,
} from '@/lib/journey.ts';
import {
  SearchStage, EnquiryStage, ResearchStage, QuoteStage, ReviewStage, SupplierStage, ManufactureStage,
} from '@/components/journey/stages.tsx';

/**
 * One enquiry, told one screen at a time. Prose, one visual, one way forward.
 * Every step has its own URL (?s=n) so back, forward and deep links all work;
 * the rail allows jumping anywhere. Data for the live steps is fetched once on
 * arrival so each screen is ready by the time it is reached.
 */
export function Journey({ metrics }: { metrics: Record<string, StepMetric> }) {
  const params = useSearchParams();
  const raw = Number(params.get('s') ?? 0);
  const index = Number.isFinite(raw) ? Math.max(0, Math.min(STEPS.length - 1, Math.floor(raw))) : 0;
  const step = STEPS[index];

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, i));
    window.history.pushState(null, '', next === 0 ? '?' : `?s=${next}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ------------------------------------------------------------- live data
  const [search, setSearch] = useState<any>(null);
  const [brief, setBrief] = useState<any>(null);
  const [pkg, setPkg] = useState<any>(null);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const fetched = useRef(false);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(url);
    return r.json();
  };
  const runSearch = useCallback((q: string) => post('/api/search', { query: q, limit: 6 }), []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    runSearch(CUSTOMER_QUERY).then(setSearch).catch(() => {});
    post('/api/knowledge', { question: RESEARCH_QUESTION }).then((d) => setBrief(d.brief)).catch(() => {});
    post('/api/workflow', { reference: 'RFQ-10482' }).then(setPkg).catch(() => {});
  }, [runSearch]);

  // -------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go]);

  // ---------------------------------------------------------------- ledger
  const ledger = useMemo(() => {
    const rows = STEPS.map((s, i) => ({ s, i, m: s.metric ? metrics[s.metric] : undefined }))
      .filter((r): r is { s: typeof STEPS[number]; i: number; m: StepMetric } => Boolean(r.m));
    const totalBefore = rows.reduce((a, r) => a + r.m.before, 0);
    const totalAfter = rows.reduce((a, r) => a + r.m.after, 0);
    const done = rows.filter((r) => r.i <= index);
    return {
      rows, totalBefore, totalAfter,
      before: done.reduce((a, r) => a + r.m.before, 0),
      after: done.reduce((a, r) => a + r.m.after, 0),
      latest: done[done.length - 1] ?? null,
    };
  }, [metrics, index]);

  const rfqVolume = metrics['RFQ preparation']?.volume ?? 1900;

  // ----------------------------------------------------------------- copy
  const content: Record<StepId, { lines: React.ReactNode[]; stage?: React.ReactNode; cta?: string }> = {
    start: {
      lines: [
        'This is one enquiry, followed from the first question to the finished tool.',
        'At each step you’ll see what happens — and how much of someone’s time it takes, today and with AI.',
      ],
      stage: (
        <p className="text-[12.5px] leading-relaxed text-ink-400">
          The catalogue in this story is Field’s real, published one. Everything behind Field’s doors
          — the customer, their history, the quotes — is synthetic, and labelled as such.
          <br />Use the arrow keys, or the steps above, to move around.
        </p>
      ),
      cta: 'Begin',
    },
    search: {
      lines: [
        'An engineer in Singapore needs tooling for a Boeing 787 thrust reverser.',
        'They don’t know Field’s part numbers. They just describe the job.',
      ],
      stage: <SearchStage initial={search} onSearch={runSearch} />,
    },
    enquiry: {
      lines: [
        'They send Field a request for quotation.',
        'Seventeen items. The aircraft has to be back in service in ten weeks.',
      ],
      stage: <EnquiryStage pkg={pkg} />,
    },
    research: {
      lines: [
        'Before anyone replies, someone needs to know this customer.',
        'Today that means digging through old quotes and emails. Here, it takes a second.',
      ],
      stage: <ResearchStage brief={brief} />,
    },
    quote: {
      lines: [
        'Every line of the request is checked against the catalogue.',
        'Most match exactly. The ones that don’t are flagged — not guessed.',
      ],
      stage: <QuoteStage pkg={pkg} />,
    },
    review: {
      lines: [
        'Three lines need an engineer.',
        'The system says why and shows the evidence. The person decides.',
      ],
      stage: (
        <ReviewStage
          pkg={pkg}
          reviewed={reviewed}
          onReview={(line) => setReviewed((s) => new Set(s).add(line))}
        />
      ),
    },
    supplier: {
      lines: [
        'Before promising a date, the lead time has to be right.',
        'Two of Field’s own records disagree. The system flags it instead of picking one.',
      ],
      stage: <SupplierStage brief={brief} />,
    },
    manufacture: {
      lines: [
        'The order goes to manufacture.',
        'This is the part AI doesn’t shorten. What it did was make sure the ten-week promise was safe to make.',
      ],
      stage: <ManufactureStage peopleMinutes={ledger.totalAfter} />,
    },
    summary: {
      lines: ['One enquiry, start to finish.'],
      stage: (
        <Summary
          before={ledger.totalBefore}
          after={ledger.totalAfter}
          volume={rfqVolume}
          onRestart={() => go(0)}
        />
      ),
    },
  };

  const c = content[step.id];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* --------------------------------------------------------------- top */}
      <header className="mx-auto flex w-full max-w-4xl items-center gap-6 px-6 pt-6 sm:px-10">
        <button onClick={() => go(0)} className="flex items-center gap-2" aria-label="Back to the start">
          <span className="h-2 w-2 rotate-45 bg-signal-700" />
          <span className="text-[12px] font-medium tracking-tight text-ink-800">Field</span>
        </button>
        <Link href="/demos" className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600">
          All demos
        </Link>
      </header>

      {/* -------------------------------------------------------------- rail */}
      <nav aria-label="Journey" className="mx-auto mt-8 w-full max-w-4xl px-6 sm:px-10">
        <ol className="flex items-center">
          {STEPS.map((s, i) => (
            <li key={s.id} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && <span className={`h-px flex-1 ${i <= index ? 'bg-signal-600' : 'bg-ink-100'}`} />}
              <button
                onClick={() => go(i)}
                title={s.rail}
                aria-current={i === index ? 'step' : undefined}
                className="group relative grid h-5 w-5 shrink-0 place-items-center"
              >
                <span
                  className={`block rounded-full transition-all ${
                    i === index ? 'h-2.5 w-2.5 bg-signal-700'
                    : i < index ? 'h-1.5 w-1.5 bg-signal-600'
                    : 'h-1.5 w-1.5 bg-ink-200 group-hover:bg-ink-400'
                  }`}
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
          ))}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ screen */}
      <main key={step.id} className="mx-auto w-full max-w-2xl flex-1 px-6 pb-48 pt-[11vh] sm:px-10">
        {step.data && <DataTag kind={step.data} />}

        <div className="space-y-4">
          {c.lines.map((line, i) => (
            <p
              key={i}
              className={`step-in font-light leading-[1.25] ${i === 0 ? 'text-[28px] text-ink-950 sm:text-[34px]' : 'text-[19px] text-ink-500 sm:text-[22px]'}`}
              style={{ animationDelay: `${150 + i * 450}ms` }}
            >
              {line}
            </p>
          ))}
        </div>

        {c.stage && (
          <div className="step-in mt-12" style={{ animationDelay: `${350 + c.lines.length * 450}ms` }}>
            {c.stage}
          </div>
        )}

        {!isLast && (
          <div className="step-in mt-12 flex items-center gap-6" style={{ animationDelay: `${600 + c.lines.length * 450}ms` }}>
            <button
              onClick={() => go(index + 1)}
              className="rounded-[2px] bg-action-600 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-action-500"
            >
              {c.cta ?? 'Continue'} →
            </button>
            {index > 0 && (
              <button onClick={() => go(index - 1)} className="text-[12.5px] text-ink-400 transition-colors hover:text-signal-600">
                ← Back
              </button>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------ ledger */}
      {index > 0 && !isLast && <Ledger ledger={ledger} />}
    </div>
  );
}

function DataTag({ kind }: { kind: 'real' | 'synthetic' | 'mixed' }) {
  const t = {
    real: { text: 'Real Field catalogue', cls: 'text-[color:var(--color-strong-600)]' },
    synthetic: { text: 'Synthetic records', cls: 'text-[color:var(--color-caution-600)]' },
    mixed: { text: 'Synthetic enquiry · real catalogue', cls: 'text-signal-600' },
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
  before, after, volume, onRestart,
}: { before: number; after: number; volume: number; onRestart: () => void }) {
  const hoursPerYear = Math.round(((before - after) * volume) / 60);
  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200">
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-ink-400">TODAY</p>
          <p className="mt-2 text-[30px] font-light text-ink-400">{formatMinutes(before)}</p>
        </div>
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-signal-600">WITH AI</p>
          <p className="mt-2 text-[30px] font-light text-ink-950">{formatMinutes(after)}</p>
        </div>
      </div>

      <p className="step-in mt-8 text-[19px] font-light leading-snug text-ink-700" style={{ animationDelay: '500ms' }}>
        Across {volume.toLocaleString()} enquiries a year, that is roughly{' '}
        <span className="text-ink-950">{hoursPerYear.toLocaleString()} hours</span> of people’s time
        given back.
      </p>
      <p className="step-in mt-2 text-[12px] leading-relaxed text-ink-400" style={{ animationDelay: '650ms' }}>
        Illustrative. Times and volumes are demonstration assumptions, not Field measurements —
        every one is adjustable in <Link href="/roi" className="underline decoration-dotted underline-offset-[3px] hover:text-signal-600">the model</Link>.
      </p>

      <p className="step-in mt-12 text-[15px] leading-relaxed text-ink-700" style={{ animationDelay: '850ms' }}>
        Everything you’ve just seen was built from Field’s public catalogue alone. When you want it
        pointed at the real thing, reply to the message this link arrived in.
      </p>

      <div className="step-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: '1000ms' }}>
        <button
          onClick={onRestart}
          className="rounded-[2px] border border-ink-300 px-5 py-2.5 text-[13px] text-ink-800 transition-colors hover:border-signal-600 hover:text-signal-700"
        >
          ↺ Start again
        </button>
        <Link href="/demos" className="text-[13px] text-signal-600 transition-colors hover:text-action-600">
          Explore each demo on its own →
        </Link>
      </div>
    </div>
  );
}
