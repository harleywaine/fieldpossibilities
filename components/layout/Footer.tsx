import { catalogueMeta, catalogueStats } from '@/lib/db/client.ts';
import { providerInfo } from '@/lib/ai/provider.ts';

/** Trust indicators (brief §37) — deliberately quiet, for technical readers. */
export function Footer() {
  let meta = null;
  let stats = null;
  try { meta = catalogueMeta(); } catch { /* catalogue not yet ingested */ }
  try { stats = catalogueStats(); } catch { /* catalogue not yet ingested */ }
  const ai = providerInfo();

  const syncedAt = stats?.lastCrawl ?? meta?.crawl_completed ?? null;
  const synced = syncedAt
    ? new Date(syncedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  const detailPct = stats && stats.products > 0
    ? Math.round((stats.detailCrawled / stats.products) * 1000) / 10
    : null;

  return (
    <footer className="mt-20 border-t border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Catalogue source</div>
          <p className="mt-1.5 text-sm text-ink-700 dark:text-ink-200">Field International public catalogue</p>
          <a
            href="https://www.fieldinternational.com/gse-and-tools/"
            target="_blank" rel="noopener noreferrer nofollow"
            className="mt-1 inline-block text-xs text-ink-500 underline underline-offset-2 hover:text-signal-600 dark:text-ink-400"
          >
            fieldinternational.com
          </a>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Last catalogue sync</div>
          <p className="mt-1.5 text-sm text-ink-700 dark:text-ink-200">{synced}</p>
          {stats && (
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {stats.products.toLocaleString()} products
              {detailPct !== null && ` · ${detailPct}% detail coverage`}
            </p>
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">AI search</div>
          <p className="mt-1.5 text-sm text-ink-700 dark:text-ink-200">Catalogue data + semantic matching</p>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{ai.describe}</p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Status</div>
          <p className="mt-1.5 text-sm text-ink-700 dark:text-ink-200">Demonstration prototype</p>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            Customer and quote data is synthetic. Catalogue data is read from a stored snapshot of
            publicly available listings.
          </p>
        </div>
      </div>
    </footer>
  );
}
