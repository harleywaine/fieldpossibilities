import Link from 'next/link';
import { browse, browseFacets } from '@/lib/catalogue/browse.ts';
import { catalogueAvailable } from '@/lib/db/client.ts';
import { ProductCard } from '@/components/product/ProductCard.tsx';
import { CatalogueFilters } from '@/components/catalogue/CatalogueFilters.tsx';
import type { ScoredProduct } from '@/lib/catalogue/types.ts';

export const dynamic = 'force-dynamic';

type SP = Record<string, string | undefined>;

export default async function CataloguePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  if (!catalogueAvailable()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="card p-6">
          <h1 className="text-lg font-semibold">Catalogue not yet ingested</h1>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
            Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs dark:bg-ink-850">npm run scrape</code> first.
          </p>
        </div>
      </div>
    );
  }

  const query = {
    manufacturer: sp.manufacturer,
    aircraft: sp.aircraft,
    category: sp.category,
    engine: sp.engine,
    text: sp.text,
    hasLeadTime: sp.leadtime === '1',
    page: sp.page ? Number(sp.page) : 1,
  };

  const result = browse(query);
  const facets = browseFacets(query);

  // Browsing is a conventional listing: no requirement, so no match classification.
  const asScored = (p: (typeof result.products)[number]): ScoredProduct => ({
    product: p, score: 0, matchClass: 'none', evidence: [], gaps: [], breakdown: {},
  });

  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...sp, ...patch, page: patch.page ?? undefined };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, String(v));
    return `/catalogue${next.toString() ? `?${next}` : ''}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">Browse catalogue</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          The conventional route: filter by manufacturer, aircraft, category and lead time.{' '}
          <Link href="/search" className="text-signal-600 underline underline-offset-2 dark:text-signal-400">
            Or describe what you need instead →
          </Link>
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <CatalogueFilters facets={facets} current={query} />

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium text-ink-800 dark:text-ink-100">
              {result.total.toLocaleString()} {result.total === 1 ? 'product' : 'products'}
            </span>
            <span className="text-xs text-ink-400">
              page {result.page} of {result.pages.toLocaleString()}
            </span>
          </div>

          {result.products.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-ink-600 dark:text-ink-300">
                No catalogue products match these filters.
              </p>
              <Link href="/catalogue" className="mt-3 inline-block text-sm text-signal-600 underline">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {result.products.map((p) => (
                <ProductCard key={p.id} scored={asScored(p)} showEvidence={false} showMatch={false} />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2">
              {result.page > 1 && (
                <Link href={qs({ page: String(result.page - 1) })} className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-850">
                  Previous
                </Link>
              )}
              <span className="px-2 text-xs tabular-nums text-ink-400">
                {result.page} / {result.pages}
              </span>
              {result.page < result.pages && (
                <Link href={qs({ page: String(result.page + 1) })} className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-850">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
