import type { DataKind } from '@/lib/levels.ts';
import { DATA_BADGE } from '@/lib/levels.ts';

/**
 * The single most important label in the application (brief §54): it keeps the
 * real public catalogue and the fabricated internal data visibly distinct.
 */
export function DataBadge({ kind, className = '' }: { kind: DataKind; className?: string }) {
  const b = DATA_BADGE[kind];
  const tone = {
    real: { text: 'text-[color:var(--color-strong-600)]', dot: 'bg-[color:var(--color-strong-600)]', ring: 'border-[color:var(--color-strong-600)]/25' },
    synthetic: { text: 'text-[color:var(--color-caution-600)]', dot: 'bg-[color:var(--color-caution-600)]', ring: 'border-[color:var(--color-caution-600)]/30' },
    mixed: { text: 'text-signal-600', dot: 'bg-signal-500', ring: 'border-signal-600/25' },
  }[b.tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[2px] border bg-white px-2 py-[3px] ${tone.ring} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <span className={`text-[10px] font-semibold tracking-[0.07em] ${tone.text}`}>{b.label}</span>
    </span>
  );
}

/** Full-width notice used at the top of any page built on fabricated data. */
export function SyntheticNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex gap-3 border-l-2 border-[color:var(--color-caution-600)]/40 bg-[color:var(--color-caution-600)]/[0.045] px-4 py-3.5">
      <svg viewBox="0 0 14 14" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[color:var(--color-caution-600)]" aria-hidden="true">
        <path d="M7 1.6 13 12.4H1z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M7 5.8v2.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="7" cy="10.3" r=".6" fill="currentColor" />
      </svg>
      <p className="text-[12px] leading-relaxed text-ink-600">
        <span className="font-semibold text-[color:var(--color-caution-600)]">Synthetic demonstration data.</span>{' '}
        {children ?? (
          <>
            The internal documents, customers, enquiries and figures in this demonstration are
            fabricated to model how Field’s records might look. They are not real Field
            International information. Only the product catalogue is real public data.
          </>
        )}
      </p>
    </div>
  );
}
