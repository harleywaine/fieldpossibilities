import { MatchBadge } from '@/components/ui/primitives.tsx';
import type { MatchClass } from '@/lib/catalogue/types.ts';

export interface TourResult {
  id: string;
  partNumber: string | null;
  name: string;
  manufacturer: string | null;
  aircraftModel: string | null;
  engine: string | null;
  maintenanceCategory: string | null;
  leadTimeDays: number | null;
  sourceUrl: string;
  matchClass: MatchClass;
  gap: string | null;
}

/**
 * Compact result for tour chapters. Self-contained: the external source link is
 * the proof ("check us against your own website"), and the full product page
 * opens in a new tab so the tour never loses his place.
 */
export function ResultCard({ r }: { r: TourResult }) {
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <MatchBadge cls={r.matchClass} />
        <span className="mono text-[12.5px] font-medium text-signal-600">{r.partNumber ?? '—'}</span>
      </div>
      <h3 className="mt-2 text-[13px] leading-snug text-ink-800">{r.name}</h3>
      <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <Meta k="Aircraft" v={r.aircraftModel} />
        {r.engine && <Meta k="Engine" v={r.engine} />}
        <Meta k="Category" v={r.maintenanceCategory} />
        <Meta k="Lead time" v={r.leadTimeDays !== null ? `${r.leadTimeDays} days` : null} mutedNull />
      </dl>
      {r.gap && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-[color:var(--color-caution-600)]">
          ⚠ {r.gap}
        </p>
      )}
      <div className="rule mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5">
        <a
          href={r.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[11px] text-ink-400 underline decoration-dotted underline-offset-[3px] transition-colors hover:text-signal-600"
        >
          Verify on fieldinternational.com ↗
        </a>
        <a
          href={`/product/${r.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[11px] font-medium text-signal-600 transition-colors hover:text-action-600"
        >
          Full product page ↗
        </a>
      </div>
    </article>
  );
}

function Meta({ k, v, mutedNull = false }: { k: string; v: string | null; mutedNull?: boolean }) {
  if (v === null && !mutedNull) return null;
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-400">{k}</dt>
      <dd className={v === null ? 'italic text-ink-300' : 'font-medium text-ink-700'}>
        {v ?? 'not published'}
      </dd>
    </div>
  );
}

/** Maps an API result onto the compact card shape. */
export function toTourResult(r: any): TourResult {
  return {
    id: r.product.id,
    partNumber: r.product.partNumber,
    name: r.product.name,
    manufacturer: r.product.manufacturer,
    aircraftModel: r.product.aircraftModel,
    engine: r.product.engine,
    maintenanceCategory: r.product.maintenanceCategory,
    leadTimeDays: r.product.leadTimeDays,
    sourceUrl: r.product.sourceUrl,
    matchClass: r.matchClass,
    gap: r.gaps?.[0] ?? null,
  };
}
