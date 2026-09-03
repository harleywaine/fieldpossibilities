import Link from 'next/link';
import { SearchBar } from '@/components/ai-search/SearchBar.tsx';
import { SuggestedPrompts } from '@/components/ai-search/SuggestedPrompts.tsx';
import { levelBySlug } from '@/lib/levels.ts';
import { LevelHeader, ValuePanel } from '@/components/layout/LevelHeader.tsx';
import { catalogueStats, catalogueAvailable } from '@/lib/db/client.ts';

export const dynamic = 'force-dynamic';

export default function CustomerAiPage() {
  const level = levelBySlug('customer-ai')!;
  const ready = catalogueAvailable();
  const stats = ready ? safeStats() : null;

  return (
    <div>
      <LevelHeader
        level={level}
        title="Find the tooling you need."
        strap="Describe your aircraft, maintenance task or tooling requirement in plain English."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-[3px] border border-[color:var(--color-strong-600)]/25 bg-[color:var(--color-strong-600)]/8 px-4 py-3">
          <p className="text-xs leading-relaxed text-ink-700">
            <strong className="text-[color:var(--color-strong-600)]">Real data.</strong>{' '}
            This demonstration runs against {stats ? stats.products.toLocaleString() : 'the'} products
            ingested from Field International’s public catalogue. Every result links back to its
            original product page, and no product fact is invented.
          </p>
        </div>

        {!ready ? (
          <div className="card mt-6 p-6">
            <h2 className="text-base font-medium">Catalogue not yet ingested</h2>
            <p className="mt-2 text-sm text-ink-600">
              Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run scrape</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <SearchBar size="lg" autoFocus />
            </div>
            <div className="mt-6">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Try</p>
              <SuggestedPrompts />
            </div>

            {stats && (
              <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat value={stats.products.toLocaleString()} label="Catalogue products" />
                <Stat value={String(stats.aircraftModels)} label="Aircraft models" />
                <Stat value={String(stats.maintenanceCategories)} label="Maintenance categories" />
                <Stat value={`${stats.withLeadTime.toLocaleString()}`} label="With published lead time" />
              </div>
            )}

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="card p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Traditional</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Search → filters → pages → products. The customer needs to know the part number,
                  the catalogue taxonomy and Field’s product naming.
                </p>
                <Link href="/catalogue" className="mt-3 inline-block text-sm text-signal-600 underline underline-offset-2">
                  Browse catalogue →
                </Link>
              </div>
              <div className="card border-signal-300 p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-signal-600">AI</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  Describe the requirement → relevant tooling, with the evidence behind every match
                  and a link to the original catalogue entry.
                </p>
                <Link href="/architecture" className="mt-3 inline-block text-sm text-signal-600 underline underline-offset-2">
                  How it works →
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <ValuePanel
                items={[
                  { label: 'Less catalogue searching', detail: 'A customer describes the engineering task instead of navigating 8,000 products by part number.' },
                  { label: 'Faster customer response', detail: 'Relevant records surface in well under a second, with the evidence already attached.' },
                  { label: 'Lower friction', detail: 'No need to know Field terminology, catalogue taxonomy or exact product naming.' },
                  { label: 'More qualified enquiries', detail: 'Enquiries arrive with part numbers already identified, rather than as open questions.' },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="text-xl font-semibold tabular-nums tracking-tight text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  );
}

function safeStats() {
  try { return catalogueStats(); } catch { return null; }
}
