import Link from 'next/link';
import { SearchBar } from '@/components/ai-search/SearchBar.tsx';
import { SuggestedPrompts } from '@/components/ai-search/SuggestedPrompts.tsx';
import { catalogueStats, catalogueAvailable } from '@/lib/db/client.ts';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const ready = catalogueAvailable();
  const stats = ready ? safeStats() : null;

  return (
    <div>
      {/* ---------------------------------------------------------- hero */}
      <section className="field-banner relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-signal-300">
            Field Tooling Intelligence
          </p>
          <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-white sm:text-5xl">
            Find the tooling you need.
          </h1>
          <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-signal-100">
            Describe your aircraft, maintenance task or tooling requirement in plain English.
          </p>

          <div className="mt-8">
            <SearchBar size="lg" autoFocus onDark />
          </div>

          <div className="mt-6">
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-signal-300">
              Try
            </p>
            <SuggestedPrompts onDark />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- catalogue facts */}
      {stats && (
        <section className="border-b border-ink-100 bg-white">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:px-6 md:grid-cols-4">
            <Stat value={stats.products.toLocaleString()} label="Catalogue products" />
            <Stat value={stats.aircraftModels.toString()} label="Aircraft models" />
            <Stat value={stats.maintenanceCategories.toString()} label="Maintenance categories" />
            <Stat value={stats.manufacturers.toString()} label="Manufacturers" />
          </div>
          <p className="mx-auto max-w-5xl px-4 pb-8 text-xs text-ink-400 sm:px-6">
            Ingested from the Field International public catalogue. Every result links back to its
            original product page.
          </p>
        </section>
      )}

      {!ready && (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Catalogue not yet ingested</h2>
            <p className="mt-2 text-sm text-ink-600">
              Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run scrape</code>{' '}
              to crawl and persist the Field International catalogue, then reload this page.
            </p>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ traditional vs AI */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Traditional</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Search → filters → pages → products. You need to know the part number, the catalogue
              taxonomy, and Field&rsquo;s product naming.
            </p>
            <Link href="/catalogue" className="mt-4 inline-block text-sm text-signal-600 underline underline-offset-2">
              Browse catalogue →
            </Link>
          </div>
          <div className="card border-signal-300 p-6 ring-1 ring-signal-500/15">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-signal-600">
              AI
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              Describe the requirement → relevant tooling, with the evidence behind every match and
              a link to the original catalogue entry.
            </p>
            <Link href="/architecture" className="mt-4 inline-block text-sm text-signal-600 underline underline-offset-2">
              How it works →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink-900">{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  );
}

function safeStats() {
  try { return catalogueStats(); } catch { return null; }
}
