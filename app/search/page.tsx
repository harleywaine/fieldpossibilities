import { Suspense } from 'react';
import { SearchBar } from '@/components/ai-search/SearchBar.tsx';
import { SuggestedPrompts } from '@/components/ai-search/SuggestedPrompts.tsx';
import { ProcessingState } from '@/components/ai-search/ProcessingState.tsx';
import { SearchResults } from '@/components/ai-search/SearchResults.tsx';
import { retrieve } from '@/lib/ai/retrieval.ts';
import { explainSearch } from '@/lib/ai/explain.ts';
import { catalogueAvailable } from '@/lib/db/client.ts';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <SearchBar initial={query} size="lg" />

      {!query ? (
        <div className="mt-8">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Try</p>
          <SuggestedPrompts />
        </div>
      ) : !catalogueAvailable() ? (
        <div className="card mt-8 p-6">
          <h2 className="text-base font-semibold">Catalogue not yet ingested</h2>
          <p className="mt-2 text-sm text-ink-600">
            Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run scrape</code>{' '}
            to ingest the Field International catalogue.
          </p>
        </div>
      ) : (
        <Suspense key={query} fallback={<Skeleton />}>
          <Results query={query} />
        </Suspense>
      )}
    </div>
  );
}

async function Results({ query }: { query: string }) {
  const result = retrieve(query, { limit: 24 });
  const assessment = await explainSearch(result.requirement, result.results, {
    strong: result.trace.strong,
    potential: result.trace.potential,
  });

  return (
    <div className="mt-8">
      <ProcessingState
        understood={result.requirement.understood}
        steps={result.trace.steps}
        recordCount={result.trace.strong + result.trace.potential}
        alternativeCount={result.trace.alternative}
        durationMs={result.trace.durationMs}
      >
        <SearchResults
          results={result.results}
          assessment={assessment}
          query={query}
          noConfirmedMatch={result.noConfirmedMatch}
        />
      </ProcessingState>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card relative overflow-hidden p-4">
            <div className="sweep absolute inset-0" />
            <div className="h-3 w-32 rounded bg-ink-100" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-full rounded bg-ink-100" />
              <div className="h-3 w-4/5 rounded bg-ink-100" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-ink-400">Searching the Field catalogue…</p>
    </div>
  );
}
