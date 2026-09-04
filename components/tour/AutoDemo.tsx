'use client';

import { useEffect, useRef, useState } from 'react';
import { GOLDEN_QUERY } from '@/lib/tour.ts';
import { ProcessingState } from '@/components/ai-search/ProcessingState.tsx';
import { AssessmentPanel } from '@/components/ai-search/AssessmentPanel.tsx';
import { ResultCard, toTourResult } from '@/components/tour/ResultCard.tsx';

type Phase = 'idle' | 'typing' | 'running' | 'done' | 'error';

/**
 * The self-running demonstration. The typing is theatre; everything under it is
 * real — the fetch fires on mount, in parallel, so by the time the query has
 * "been typed" the genuine results are already waiting. Reduced-motion users
 * (and the Skip control) jump straight to the outcome.
 */
export function AutoDemo({ beat }: { beat?: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [typed, setTyped] = useState('');
  const [data, setData] = useState<any>(null);
  const dataRef = useRef<any>(null);
  const skipRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Real work starts immediately.
    const request = fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GOLDEN_QUERY, limit: 12 }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('search failed');
        const d = await res.json();
        if (!cancelled) {
          dataRef.current = d;
          setData(d);
        }
        return d;
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
        return null;
      });

    const finish = async () => {
      setTyped(GOLDEN_QUERY);
      setPhase('running');
      const d = dataRef.current ?? (await request);
      if (!cancelled && d) setPhase('done');
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      void finish();
      return () => { cancelled = true; };
    }

    // Theatre: type the query against the wall clock. Browsers throttle timers
    // in unfocused tabs; anchoring progress to elapsed time means throttling
    // makes the typing chunkier, never slower — it always lands in ~4s.
    setPhase('typing');
    const CPS = 34; // characters per second
    const startAt = Date.now() + 600;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      const due = Math.floor(((Date.now() - startAt) / 1000) * CPS);
      const i = skipRef.current ? GOLDEN_QUERY.length : Math.max(0, Math.min(GOLDEN_QUERY.length, due));
      setTyped(GOLDEN_QUERY.slice(0, i));
      if (i >= GOLDEN_QUERY.length) {
        void finish();
        return;
      }
      timer = setTimeout(tick, 40);
    };
    timer = setTimeout(tick, 60);

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const top = (data?.results ?? []).slice(0, 3);

  return (
    <div>
      {/* ----------------------------------------------------- query stage */}
      <div className="relative rounded-[2px] border border-ink-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="min-h-[44px] flex-1 text-[15px] leading-relaxed text-ink-900">
            {typed}
            {(phase === 'typing' || phase === 'idle') && (
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-signal-600" />
            )}
          </p>
        </div>
        {phase === 'typing' && (
          <button
            onClick={() => { skipRef.current = true; }}
            className="absolute right-3 top-3 text-[10.5px] text-ink-300 transition-colors hover:text-signal-600"
          >
            Skip ahead
          </button>
        )}
      </div>

      {/* --------------------------------------------------------- outcome */}
      {phase === 'error' && (
        <p className="mt-4 text-[12.5px] text-ink-500">
          The live demonstration could not reach the catalogue just now — continue to the next
          chapter and try the interactive search there.
        </p>
      )}

      {(phase === 'running' || phase === 'done') && data && (
        <div className="step-in mt-6">
          <ProcessingState
            understood={data.requirement.understood}
            steps={data.trace.steps}
            recordCount={data.trace.strong + data.trace.potential}
            alternativeCount={data.trace.alternative}
            durationMs={data.trace.durationMs}
          >
            <div className="space-y-5">
              <AssessmentPanel {...data.assessment} />
              <div>
                <p className="label mb-3">Top matches — of {data.trace.strong} strong</p>
                <div className="space-y-3">
                  {top.map((r: any) => (
                    <ResultCard key={r.product.id} r={toTourResult(r)} />
                  ))}
                </div>
              </div>
            </div>
          </ProcessingState>
          {phase === 'done' && beat}
        </div>
      )}
    </div>
  );
}
