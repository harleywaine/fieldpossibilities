'use client';

import { useState } from 'react';
import { AIBadge } from '@/components/ui/primitives.tsx';

const SUGGESTED = [
  'Which one can be delivered fastest?',
  'Can this product replace the specified tooling?',
  'What does the catalogue not tell me here?',
];

/** Follow-up questions answered only against the retrieved records (brief §21). */
export function AskPanel({ ids, query }: { ids: string[]; query: string }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState<Array<{ q: string; a: string; provider: string; disclaimer: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, ids, query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to answer.');
      setThread((t) => [...t, { q, a: data.answer.text, provider: data.answer.provider, disclaimer: data.answer.disclaimer }]);
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to answer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Ask about these results</h2>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
        Answered only from the catalogue records retrieved above.
      </p>

      {thread.length > 0 && (
        <div className="mt-4 space-y-4">
          {thread.map((t, i) => (
            <div key={i} className="border-l-2 border-signal-500/30 pl-3">
              <p className="text-sm font-medium text-ink-900 dark:text-ink-50">{t.q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{t.a}</p>
              <div className="mt-2"><AIBadge provider={t.provider} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') ask(question); }}
          placeholder="Ask a question about these products…"
          className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-signal-400 focus:ring-4 focus:ring-signal-500/10 dark:border-ink-700 dark:bg-ink-850"
        />
        <button
          onClick={() => ask(question)}
          disabled={busy || !question.trim()}
          className="rounded-lg bg-signal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-signal-500 disabled:opacity-40"
        >
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-600 transition hover:border-signal-300 hover:text-signal-600 disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
