import Link from 'next/link';
import { getProducts } from '@/lib/db/client.ts';
import { CompareTable } from '@/components/comparison/CompareTable.tsx';

export const dynamic = 'force-dynamic';

export default async function ComparePage({
  searchParams,
}: { searchParams: Promise<{ ids?: string; q?: string }> }) {
  const { ids, q } = await searchParams;
  const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const products = list.length ? getProducts(list) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">Compare products</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Built from the catalogue records themselves. Fields the catalogue does not publish are
          shown as such rather than hidden or estimated.
        </p>
      </header>

      {products.length < 2 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Select at least two products to compare.
          </p>
          <Link href="/search" className="mt-3 inline-block text-sm text-signal-600 underline underline-offset-2">
            Search the catalogue
          </Link>
        </div>
      ) : (
        <CompareTable products={products} query={q ?? ''} />
      )}
    </div>
  );
}
