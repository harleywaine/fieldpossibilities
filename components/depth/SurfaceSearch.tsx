'use client';

import { useEffect, useRef, useState } from 'react';
import { GOLDEN_QUERY } from '@/lib/depth.ts';
import { ProcessingState } from '@/components/ai-search/ProcessingState.tsx';
import { AssessmentPanel } from '@/components/ai-search/AssessmentPanel.tsx';
import { ResultCard, toTourResult } from '@/components/depth/ResultCard.tsx';

type Phase = 'idle' | 'typing' | 'running' | 'done' | 'error';

const CHIPS = [
  'Handling equipment for a 737-800 stabilizer',
  'Landing gear jacking equipment for a 747',
  'K78002-70',
];

/**
 * The surface, in one object. It demonstrates itself — the golden query types
 * in against the wall clock while the real request runs in parallel — and then
 * hands over: the same box becomes a live input, no mode switch, no second UI.
 */
export function SurfaceSearch() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [typed, setTyped] = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const dataRef = useRef<any>(null);
  const skipRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const search = async (query: string) => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 12 }),
    });
    if (!res.ok) throw new Error('search failed');
    return res.json();
  };

  // ---- The opening act: theatre in front, real work behind -----------------
  // Cancellation-based, so StrictMode's mount → cleanup → remount in dev
  // simply restarts the theatre instead of stranding it.
  useEffect(() => {
    let cancelled = false;

    const request = search(GOLDEN_QUERY)
      .then((d) => { if (!cancelled) { dataRef.current = d; setData(d); } return d; })
      .catch(() => { if (!cancelled) setPhase('error'); return null; });

    const finish = async () => {
      setTyped(GOLDEN_QUERY);
      setPhase('running');
      const d = dataRef.current ?? (await request);
      if (!cancelled && d) setPhase('done');
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void finish();
      return () => { cancelled = true; };
    }

    setPhase('typing');
    const CPS = 34;
    const startAt = Date.now() + 600;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      const due = Math.floor(((Date.now() - startAt) / 1000) * CPS);
      const i = skipRef.current ? GOLDEN_QUERY.length : Math.max(0, Math.min(GOLDEN_QUERY.length, due));
      setTyped(GOLDEN_QUERY.slice(0, i));
      if (i >= GOLDEN_QUERY.length) { void finish(); return; }
      timer = setTimeout(tick, 40);
    };
    timer = setTimeout(tick, 60);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // ---- After the handover: a normal search --------------------------------
  const run = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setTyped(query);
    try {
      const d = await search(query);
      setData(d);
      setPhase('done');
    } catch {
      setPhase('error');
    } finally {
      setBusy(false);
    }
  };

  const interactive = phase === 'done' || phase === 'error';
  const results = (data?.results ?? []).slice(0, 4);

  return (
    <div>
      {/* -------------------------------------------------------- the box */}
      <div className="relative rounded-[2px] border border-ink-200 bg-white p-4 shadow-[0_18px_50px_-24px_rgba(4,24,47,0.45)]">
        <div className="flex items-start gap-3">
          <svg viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-ink-300" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>

          {interactive ? (
            <textarea
              ref={inputRef}
              value={typed}
              rows={2}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void run(typed); }
              }}
              className="min-h-0 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink-900 outline-none placeholder:text-ink-300"
              placeholder="Ask your own — an aircraft, a task, a part number"
            />
          ) : (
            <p className="min-h-[48px] flex-1 text-[15px] leading-relaxed text-ink-900">
              {typed}
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-signal-600" />
            </p>
          )}

          {interactive && (
            <button
              onClick={() => void run(typed)}
              disabled={busy || !typed.trim()}
              className="shrink-0 self-start rounded-[2px] bg-action-600 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-35"
            >
              {busy ? 'Searching…' : 'Ask'}
            </button>
          )}
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

      {interactive && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mono mr-1 text-[9.5px] tracking-[0.16em] text-ink-300">TRY</span>
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => void run(c)}
              disabled={busy}
              className="rounded-[2px] border border-ink-200 bg-white px-2.5 py-1 text-[11.5px] text-ink-600 transition-colors hover:border-signal-300 hover:text-signal-600 disabled:opacity-40"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------- outcome */}
      {phase === 'error' && !data && (
        <p className="mt-5 text-[12.5px] text-ink-500">
          The catalogue could not be reached just now — the layers below still show the rest of
          the machine.
        </p>
      )}

      {(phase === 'running' || phase === 'done') && data && (
        <div className="step-in mt-8" key={data.requirement?.raw ?? 'run'}>
          <ProcessingState
            understood={data.requirement.understood}
            steps={data.trace.steps}
            recordCount={data.trace.strong + data.trace.potential}
            alternativeCount={data.trace.alternative}
            durationMs={data.trace.durationMs}
          >
            <div className="space-y-5">
              <AssessmentPanel {...data.assessment} />
              {results.length > 0 && (
                <div>
                  <p className="label mb-3">Closest records — of {data.trace.ranked} relevant</p>
                  <div className="space-y-3">
                    {results.map((r: any) => (
                      <ResultCard key={r.product.id} r={toTourResult(r)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ProcessingState>
        </div>
      )}
    </div>
  );
}
