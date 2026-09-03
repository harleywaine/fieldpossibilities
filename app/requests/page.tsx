import Link from 'next/link';
import { listRfqs } from '@/lib/rfq/store.ts';
import { getProducts } from '@/lib/db/client.ts';
import { Button } from '@/components/ui/primitives.tsx';

export const dynamic = 'force-dynamic';

export default function RequestsPage() {
  const requests = listRfqs();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">Quote requests</h1>
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
            Demonstration records held locally. None has been sent to Field International.
          </p>
        </div>
        <Button href="/search" variant="secondary">New search</Button>
      </header>

      {requests.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-600 dark:text-ink-300">No quote requests recorded yet.</p>
          <Link href="/search" className="mt-3 inline-block text-sm text-signal-600 underline underline-offset-2">
            Find tooling to request
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const products = r.productIds.length ? safeProducts(r.productIds) : [];
            return (
              <article key={r.id} className="card p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="mono text-sm font-semibold text-signal-600 dark:text-signal-400">{r.id}</span>
                  <span className="text-sm font-medium text-ink-900 dark:text-ink-50">{r.company}</span>
                  <span className="text-xs text-ink-500 dark:text-ink-400">{r.contact}</span>
                  <span className="ml-auto text-xs text-ink-400">
                    {new Date(r.createdAt).toLocaleString('en-GB')}
                  </span>
                </div>
                {r.requirement && (
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{r.requirement}</p>
                )}
                {products.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {products.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`/product/${p.id}`}
                          className="mono rounded border border-ink-200 px-2 py-0.5 text-[11px] text-ink-600 hover:border-signal-300 hover:text-signal-600 dark:border-ink-700 dark:text-ink-300"
                        >
                          {p.partNumber ?? p.id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-ink-100 pt-2 text-[11px] text-ink-400 dark:border-ink-800">
                  Demo record — not transmitted to Field International.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function safeProducts(ids: string[]) {
  try { return getProducts(ids); } catch { return []; }
}
