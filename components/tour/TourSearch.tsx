'use client';

import { useState } from 'react';
import { ProcessingState } from '@/components/ai-search/ProcessingState.tsx';
import { AssessmentPanel } from '@/components/ai-search/AssessmentPanel.tsx';
import { ResultCard, toTourResult } from '@/components/tour/ResultCard.tsx';

const CHIPS = [
  'Handling equipment for a 737-800 stabilizer',
  'Show me tooling for Boeing 787 exhaust maintenance',
  'Landing gear jacking equipment for a 747',
  'K78002-70',
];

/** Chapter 2: the controls in his hands, results inline so the tour keeps its place. */
export function TourSearch({ beat }: { beat?: React.ReactNode }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [asked, setAsked] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = async (q: string) => {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true); setError(null); setValue(query);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 12 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Search failed.');
      setData(d); setAsked(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  };

  const results = (data?.results ?? []).slice(0, 6);

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void run(value); }}
          placeholder="Describe the aircraft, the task, or the tooling — in plain English"
          className="flex-1 rounded-[2px] border border-ink-200 bg-white px-3.5 py-2.5 text-[14px] outline-none transition-colors placeholder:text-ink-300 focus:border-signal-500"
        />
        <button
          onClick={() => void run(value)}
          disabled={busy || !value.trim()}
          className="shrink-0 rounded-[2px] bg-action-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-action-500 disabled:opacity-35"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
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

      {error && <p className="mt-3 text-[12px] text-action-600">{error}</p>}

      {data && (
        <div className="step-in mt-7" key={asked}>
          <ProcessingState
            understood={data.requirement.understood}
            steps={data.trace.steps}
            recordCount={data.trace.strong + data.trace.potential}
            alternativeCount={data.trace.alternative}
            durationMs={data.trace.durationMs}
          >
            <div className="space-y-5">
              <AssessmentPanel {...data.assessment} />
              {results.length > 0 ? (
                <div>
                  <p className="label mb-3">
                    Closest catalogue records — showing {results.length} of {data.trace.ranked}
                  </p>
                  <div className="space-y-3">
                    {results.map((r: any) => (
                      <ResultCard key={r.product.id} r={toTourResult(r)} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-ink-500">
                  No catalogue records matched — which is itself the honest answer. Try different
                  wording.
                </p>
              )}
            </div>
          </ProcessingState>
          {!busy && beat}
        </div>
      )}
    </div>
  );
}
