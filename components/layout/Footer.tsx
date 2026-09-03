import { catalogueStats } from '@/lib/db/client.ts';
import { demoStats } from '@/lib/db/demo.ts';
import { providerInfo } from '@/lib/ai/provider.ts';

/** Trust indicators, kept quiet but precise (brief §37, §54). */
export function Footer() {
  let cat = null;
  let demo = null;
  try { cat = catalogueStats(); } catch { /* catalogue not ingested */ }
  try { demo = demoStats(); } catch { /* demo data not generated */ }
  const ai = providerInfo();

  const synced = cat?.lastCrawl
    ? new Date(cat.lastCrawl).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Real data</div>
          <p className="mt-1.5 text-sm text-ink-700">Field International public catalogue</p>
          {cat && (
            <p className="mt-1 text-xs text-ink-500">
              {cat.products.toLocaleString()} products · synced {synced}
            </p>
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Synthetic data</div>
          <p className="mt-1.5 text-sm text-ink-700">Internal business demonstration set</p>
          {demo && (
            <p className="mt-1 text-xs text-ink-500">
              {demo.documents} documents · {demo.rfqs} enquiries · {demo.quotes} quotes
            </p>
          )}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">AI layer</div>
          <p className="mt-1.5 text-sm text-ink-700">Hybrid retrieval + grounded generation</p>
          <p className="mt-1 text-xs text-ink-500">{ai.describe}</p>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Status</div>
          <p className="mt-1.5 text-sm text-ink-700">Prototype demonstrator</p>
          <p className="mt-1 text-xs text-ink-500">
            Not a deployed Field system. Internal records, customers and figures are fabricated
            for demonstration.
          </p>
        </div>
      </div>
    </footer>
  );
}
