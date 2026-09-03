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
    ? new Date(cat.lastCrawl).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <footer className="mt-24 border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <Col label="Real data" value="Field International public catalogue">
            {cat && (
              <>
                <Line k="Products" v={cat.products.toLocaleString()} />
                <Line k="Last sync" v={synced} />
              </>
            )}
          </Col>
          <Col label="Synthetic data" value="Internal business demonstration set">
            {demo && (
              <>
                <Line k="Documents" v={String(demo.documents)} />
                <Line k="Enquiries / quotes" v={`${demo.rfqs} / ${demo.quotes}`} />
              </>
            )}
          </Col>
          <Col label="AI layer" value="Hybrid retrieval + grounded generation">
            <Line k="Provider" v={ai.name} />
            <Line k="Mode" v={ai.usingLLM ? 'Hosted model' : 'Deterministic'} />
          </Col>
          <Col label="Status" value="Prototype demonstrator">
            <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
              Not a deployed Field system. Internal records, customers and figures are fabricated
              for demonstration.
            </p>
          </Col>
        </div>

        <div className="rule mt-10 flex flex-wrap items-center justify-between gap-3 pt-5">
          <p className="text-[11px] text-ink-400">
            Field AI Opportunity Lab — demonstration prototype
          </p>
          <a
            href="https://www.fieldinternational.com/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-[11px] text-ink-400 transition-colors hover:text-signal-600"
          >
            fieldinternational.com
          </a>
        </div>
      </div>
    </footer>
  );
}

function Col({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      <p className="mt-2.5 text-[13px] leading-snug text-ink-700">{value}</p>
      <dl className="mt-3 space-y-1">{children}</dl>
    </div>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] text-ink-400">{k}</dt>
      <dd className="mono text-[11px] text-ink-600">{v}</dd>
    </div>
  );
}
