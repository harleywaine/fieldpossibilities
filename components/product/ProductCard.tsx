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
    <article className="card card-hover group overflow-hidden">
      <div className="flex gap-4 p-5">
        <ProductImage product={p} className="h-24 w-24 shrink-0" />

        <div className="min-w-0 flex-1">
          {(showMatch || p.ceMarked) && (
            <div className="flex flex-wrap items-center gap-2">
              {showMatch && <MatchBadge cls={scored.matchClass} />}
              {p.ceMarked && <Chip tone="muted">CE marked in listing</Chip>}
            </div>
          )}

          <div className="mono mt-2.5 text-[13px] font-medium tracking-[0.01em] text-signal-600">
            {p.partNumber ?? '—'}
          </div>
          <h3 className="mt-1 text-[13.5px] font-normal leading-snug text-ink-800">
            <Link href={`/product/${p.id}`} className="transition-colors hover:text-signal-600">
              {p.name}
            </Link>
          </h3>

          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11.5px]">
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
                <li key={g} className="flex items-start gap-1.5 text-xs text-[color:var(--color-caution-600)]">
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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 bg-ink-25 px-5 py-2.5">
        <Link href={`/product/${p.id}`} className="text-[12px] font-medium text-signal-600 transition-colors hover:text-action-600">
          View details
        </Link>
        {onToggle && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
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
      <dd className={muted || !value ? 'text-ink-300 italic' : 'font-medium text-ink-700'}>
        {value ?? 'not published'}
      </dd>
    </div>
  );
}
