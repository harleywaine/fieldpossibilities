'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Facet } from '@/lib/catalogue/browse.ts';

export function CatalogueFilters({
  facets, current,
}: {
  facets: { manufacturers: Facet[]; aircraft: Facet[]; categories: Facet[]; engines: Facet[] };
  current: { manufacturer?: string; aircraft?: string; category?: string; engine?: string; text?: string; hasLeadTime?: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    router.push(`/catalogue${next.toString() ? `?${next}` : ''}`);
  };

  const active = Boolean(
    current.manufacturer || current.aircraft || current.category || current.engine || current.text || current.hasLeadTime,
  );

  return (
    <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
      <div>
        <label className="mb-1.5 block label">
          Keyword or part number
        </label>
        <input
          defaultValue={current.text ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') set('text', (e.target as HTMLInputElement).value || null);
          }}
          placeholder="e.g. K78002 or sling"
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-signal-400 focus:ring-4 focus:ring-signal-500/10"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={Boolean(current.hasLeadTime)}
          onChange={() => set('leadtime', current.hasLeadTime ? null : '1')}
          className="h-3.5 w-3.5 rounded accent-signal-600"
        />
        Only products with a published lead time
      </label>

      {active && (
        <button
          onClick={() => router.push('/catalogue')}
          className="text-xs text-signal-600 underline underline-offset-2"
        >
          Clear all filters
        </button>
      )}

      <FacetGroup title="Manufacturer" items={facets.manufacturers} value={current.manufacturer} onPick={(v) => set('manufacturer', v)} />
      <FacetGroup title="Aircraft model" items={facets.aircraft} value={current.aircraft} onPick={(v) => set('aircraft', v)} max={12} />
      <FacetGroup title="Maintenance category" items={facets.categories} value={current.category} onPick={(v) => set('category', v)} max={12} />
      {facets.engines.length > 0 && (
        <FacetGroup title="Engine" items={facets.engines} value={current.engine} onPick={(v) => set('engine', v)} max={10} />
      )}
    </aside>
  );
}

function FacetGroup({
  title, items, value, onPick, max = 8,
}: {
  title: string; items: Facet[]; value?: string; onPick: (v: string) => void; max?: number;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1.5 label">{title}</h3>
      <ul className="space-y-0.5">
        {items.slice(0, max).map((f) => {
          const on = value === f.value;
          return (
            <li key={f.value}>
              <button
                onClick={() => onPick(f.value)}
                className={`flex w-full items-baseline gap-2 rounded px-1.5 py-1 text-left text-xs transition ${
                  on
                    ? 'bg-signal-600/10 font-medium text-signal-600'
                    : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{f.value}</span>
                <span className="shrink-0 tabular-nums text-ink-400">{f.count.toLocaleString()}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
