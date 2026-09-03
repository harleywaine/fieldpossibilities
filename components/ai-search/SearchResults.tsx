'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ScoredProduct } from '@/lib/catalogue/types.ts';
import { ProductCard } from '@/components/product/ProductCard.tsx';
import { AssessmentPanel } from '@/components/ai-search/AssessmentPanel.tsx';
import { AskPanel } from '@/components/ai-search/AskPanel.tsx';
import { Button } from '@/components/ui/primitives.tsx';

export function SearchResults({
  results, assessment, query, noConfirmedMatch,
}: {
  results: ScoredProduct[];
  assessment: { text: string; provider: string; disclaimer: string };
  query: string;
  noConfirmedMatch: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));

  const strong = results.filter((r) => r.matchClass === 'strong');
  const others = results.filter((r) => r.matchClass !== 'strong');

  return (
    <div className="space-y-6">
      {noConfirmedMatch && results.length > 0 && (
        <div className="rounded-xl border border-[color:var(--color-caution-600)]/30 bg-[color:var(--color-caution-600)]/8 p-4">
          <h2 className="text-sm font-semibold text-[color:var(--color-caution-600)] [color:var(--color-caution-400)]">
            No confirmed catalogue match found
          </h2>
          <p className="mt-1.5 text-sm text-ink-700">
            No catalogue record satisfies every element of this requirement. The closest genuine
            catalogue entries are shown below so you can judge relevance yourself.
          </p>
        </div>
      )}

      <AssessmentPanel {...assessment} />

      {results.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-base font-semibold">No catalogue records matched</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
            The catalogue may not cover this aircraft, application or tooling type. Try different
            wording, or browse the catalogue directly.
          </p>
          <Button href="/catalogue" variant="secondary" className="mt-4">Browse catalogue</Button>
        </div>
      ) : (
        <>
          {strong.length > 0 && (
            <Group title={`Strong matches (${strong.length})`} sub="The catalogue establishes every element of the requirement it records.">
              {strong.map((r) => (
                <ProductCard key={r.product.id} scored={r} selected={selected.includes(r.product.id)} onToggle={toggle} />
              ))}
            </Group>
          )}
          {others.length > 0 && (
            <Group
              title={strong.length ? `Other relevant records (${others.length})` : `Closest records (${others.length})`}
              sub="Relevant on some dimensions; see the noted limitations on each."
            >
              {others.map((r) => (
                <ProductCard key={r.product.id} scored={r} selected={selected.includes(r.product.id)} onToggle={toggle} />
              ))}
            </Group>
          )}
        </>
      )}

      {results.length > 0 && <AskPanel ids={results.slice(0, 8).map((r) => r.product.id)} query={query} />}

      {selected.length > 0 && (
        <div className="sticky bottom-4 z-30 mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-ink-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm text-ink-700">
            {selected.length} selected {selected.length === 1 ? 'product' : 'products'}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => setSelected([])}>Clear</Button>
            {selected.length >= 2 && (
              <Button href={`/compare?ids=${selected.join(',')}&q=${encodeURIComponent(query)}`}>
                Compare {selected.length}
              </Button>
            )}
            <Button href={`/requests/new?ids=${selected.join(',')}&q=${encodeURIComponent(query)}`} variant="secondary">
              Request quote
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      <p className="mb-3 mt-0.5 text-xs text-ink-500">{sub}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
