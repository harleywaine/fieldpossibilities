'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalogue/types.ts';
import { SourceNote, Button, AIBadge } from '@/components/ui/primitives.tsx';
import { ProductImage } from '@/components/product/ProductImage.tsx';

interface Row { key: string; label: string; get: (p: Product) => string | null }

const ROWS: Row[] = [
  { key: 'part', label: 'Part number', get: (p) => p.partNumber },
  { key: 'mfr', label: 'Manufacturer', get: (p) => p.manufacturer },
  { key: 'aircraft', label: 'Aircraft', get: (p) => p.aircraftModel },
  { key: 'application', label: 'Application', get: (p) => p.application },
  { key: 'category', label: 'Maintenance category', get: (p) => p.maintenanceCategory },
  { key: 'equipment', label: 'Equipment type', get: (p) => p.equipmentType },
  { key: 'engine', label: 'Engine', get: (p) => p.engine },
  { key: 'lead', label: 'Lead time', get: (p) => (p.leadTimeDays !== null ? `${p.leadTimeDays} days` : null) },
  { key: 'weight', label: 'Weight', get: (p) => p.weight },
  { key: 'dimensions', label: 'Dimensions', get: (p) => p.dimensions },
  { key: 'condition', label: 'Condition', get: (p) => p.condition },
  { key: 'availability', label: 'Availability', get: (p) => p.availability },
];

/** Columns adapt to available data; rows empty for every product are hidden (§30). */
export function CompareTable({ products, query }: { products: Product[]; query: string }) {
  const [assessment, setAssessment] = useState<{ text: string; provider: string; disclaimer: string } | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: products.map((p) => p.id), query }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) setAssessment(data.assessment);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [products, query]);

  const visibleRows = ROWS.filter((r) => products.some((p) => r.get(p)));

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border border-ink-100">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-ink-100 bg-ink-50 p-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400" />
              {products.map((p) => (
                <th key={p.id} className="border-b border-l border-ink-100 bg-ink-50 p-3 text-left align-top">
                  <ProductImage product={p} className="mb-2 h-20 w-20" />
                  <Link href={`/product/${p.id}`} className="mono block text-xs font-semibold text-signal-600 hover:underline">
                    {p.partNumber ?? p.id}
                  </Link>
                  <span className="mt-0.5 block text-xs font-normal leading-snug text-ink-600">
                    {p.name.length > 70 ? `${p.name.slice(0, 70)}…` : p.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => (
              <tr key={r.key} className="even:bg-ink-50/40">
                <th scope="row" className="border-b border-ink-100 p-3 text-left text-[11px] font-medium uppercase tracking-wider text-ink-400">
                  {r.label}
                </th>
                {products.map((p) => {
                  const v = r.get(p);
                  return (
                    <td key={p.id} className={`border-b border-l border-ink-100 p-3 align-top  ${v ? 'text-ink-800 ' : 'text-ink-400 italic'}`}>
                      {v ?? 'Not published'}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="p-3 text-left text-[11px] font-medium uppercase tracking-wider text-ink-400">
                Source
              </th>
              {products.map((p) => (
                <td key={p.id} className="border-l border-ink-100 p-3 align-top">
                  <SourceNote url={p.sourceUrl} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border border-signal-500/25 bg-signal-500/5 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-ink-900">AI comparison</h2>
          <AIBadge provider={assessment?.provider} />
        </div>
        {busy ? (
          <p className="text-sm text-ink-400">Comparing catalogue records…</p>
        ) : assessment ? (
          <>
            <p className="text-sm leading-relaxed text-ink-800">{assessment.text}</p>
            <p className="mt-3 border-t border-signal-500/15 pt-3 text-xs text-ink-500">
              {assessment.disclaimer}
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-400">Comparison unavailable.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button href={`/requests/new?ids=${products.map((p) => p.id).join(',')}&q=${encodeURIComponent(query)}`}>
          Request a quote for these
        </Button>
        <Button href="/search" variant="secondary">New search</Button>
      </div>
    </div>
  );
}
