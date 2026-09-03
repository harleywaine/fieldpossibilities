import type { EvidenceItem, Provenance } from '@/lib/catalogue/types.ts';

const SOURCE_LABEL: Record<Provenance, string> = {
  'catalogue-record': 'Catalogue record',
  'product-description': 'Product description',
  'product-title': 'Product title',
  'product-page': 'Product page',
};

/** "Why this matches" — every claim carries its source (brief §22). */
export function EvidencePanel({
  evidence, gaps, compact = false,
}: { evidence: EvidenceItem[]; gaps: string[]; compact?: boolean }) {
  return (
    <div>
      <h3 className="mb-3 label">
        Why this matches
      </h3>

      <dl className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {evidence.map((e) => (
          <div key={`${e.label}-${e.value}`} className="rounded-lg border border-ink-100 bg-white p-3">
            <dt className="label">{e.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink-900">{e.value}</dd>
            <p className="mt-1.5 text-[11px] text-ink-500">
              Source: {SOURCE_LABEL[e.source]}
            </p>
            {e.quote && (
              <p className="mono mt-1.5 truncate rounded bg-ink-50 px-1.5 py-1 text-[10px] text-ink-500" title={e.quote}>
                {e.quote}
              </p>
            )}
          </div>
        ))}
      </dl>

      {gaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-[color:var(--color-caution-600)]/25 bg-[color:var(--color-caution-600)]/6 p-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-caution-600)]">
            What the catalogue does not establish
          </h4>
          <ul className="mt-2 space-y-1.5">
            {gaps.map((g) => (
              <li key={g} className="text-xs leading-relaxed text-ink-700">
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
