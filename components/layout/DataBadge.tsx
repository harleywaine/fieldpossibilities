import type { DataKind } from '@/lib/levels.ts';
import { DATA_BADGE } from '@/lib/levels.ts';

/**
 * The single most important label in the application (brief §54): it keeps the
 * real public catalogue and the fabricated internal data visibly distinct.
 */
export function DataBadge({ kind, className = '' }: { kind: DataKind; className?: string }) {
  const b = DATA_BADGE[kind];
  const tones = {
    real: 'bg-[color:var(--color-strong-600)]/10 text-[color:var(--color-strong-600)] ring-[color:var(--color-strong-600)]/25',
    synthetic: 'bg-[color:var(--color-caution-600)]/10 text-[color:var(--color-caution-600)] ring-[color:var(--color-caution-600)]/30',
    mixed: 'bg-signal-600/10 text-signal-600 ring-signal-600/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[3px] px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tones[b.tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${b.tone === 'real' ? 'bg-[color:var(--color-strong-600)]' : b.tone === 'synthetic' ? 'bg-[color:var(--color-caution-600)]' : 'bg-signal-600'}`} />
      {b.label}
    </span>
  );
}

/** Full-width notice used at the top of any page built on fabricated data. */
export function SyntheticNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-[3px] border border-[color:var(--color-caution-600)]/30 bg-[color:var(--color-caution-600)]/8 px-4 py-3">
      <p className="text-xs leading-relaxed text-ink-700">
        <strong className="text-[color:var(--color-caution-600)]">Synthetic demonstration data.</strong>{' '}
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
