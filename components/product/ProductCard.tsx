'use client';

import Link from 'next/link';
import type { ScoredProduct } from '@/lib/catalogue/types.ts';
import { MatchBadge, Chip, SourceNote } from '@/components/ui/primitives.tsx';
import { ProductImage } from '@/components/product/ProductImage.tsx';

export function ProductCard({
  scored, selected, onToggle, showEvidence = true, showMatch = true,
}: {
  scored: ScoredProduct;
  selected?: boolean;
  onToggle?: (id: string) => void;
  showEvidence?: boolean;
  /** Browsing has no requirement to match against, so no class is shown. */
  showMatch?: boolean;
}) {
  const p = scored.product;

  return (
    <article className="card group overflow-hidden transition hover:border-ink-200 hover:shadow-md dark:hover:border-ink-700">
      <div className="flex gap-4 p-4">
        <ProductImage product={p} className="h-24 w-24 shrink-0" />

        <div className="min-w-0 flex-1">
          {(showMatch || p.ceMarked) && (
            <div className="flex flex-wrap items-center gap-2">
              {showMatch && <MatchBadge cls={scored.matchClass} />}
              {p.ceMarked && <Chip tone="muted">CE marked in listing</Chip>}
            </div>
          )}

          <div className="mt-2 mono text-sm font-semibold text-signal-600 dark:text-signal-400">
            {p.partNumber ?? '—'}
          </div>
          <h3 className="mt-0.5 text-sm font-medium leading-snug text-ink-900 dark:text-ink-50">
            <Link href={`/product/${p.id}`} className="transition hover:text-signal-600 dark:hover:text-signal-400">
              {p.name}
            </Link>
          </h3>

          <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Meta label="Manufacturer" value={p.manufacturer} />
            <Meta label="Aircraft" value={p.aircraftModel} />
            <Meta label="Category" value={p.maintenanceCategory} />
            {p.engine && <Meta label="Engine" value={p.engine} />}
            <Meta
              label="Lead time"
              value={p.leadTimeDays !== null ? `${p.leadTimeDays} days` : null}
              muted={p.leadTimeDays === null}
            />
          </dl>

          {showEvidence && scored.gaps.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {scored.gaps.slice(0, 2).map((g) => (
                <li key={g} className="flex items-start gap-1.5 text-xs text-[color:var(--color-caution-600)] dark:text-[color:var(--color-caution-400)]">
                  <svg viewBox="0 0 12 12" className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true">
                    <path d="M6 1.5 11 10.5H1z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
                    <path d="M6 5v2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <circle cx="6" cy="8.8" r=".55" fill="currentColor" />
                  </svg>
                  {g}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ink-100 bg-ink-50/60 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-850/40">
        <Link href={`/product/${p.id}`} className="text-xs font-medium text-signal-600 hover:underline dark:text-signal-400">
          View details
        </Link>
        {onToggle && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600 dark:text-ink-300">
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={() => onToggle(p.id)}
              className="h-3.5 w-3.5 rounded border-ink-300 accent-signal-600"
            />
            Compare
          </label>
        )}
        <SourceNote url={p.sourceUrl} className="ml-auto" />
      </div>
    </article>
  );
}

function Meta({ label, value, muted = false }: { label: string; value: string | null; muted?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-400">{label}</dt>
      <dd className={muted || !value ? 'text-ink-400 italic' : 'font-medium text-ink-700 dark:text-ink-200'}>
        {value ?? 'not published'}
      </dd>
    </div>
  );
}
