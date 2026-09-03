import { getProducts } from '@/lib/db/client.ts';
import { QuoteForm } from '@/components/rfq/QuoteForm.tsx';

export const dynamic = 'force-dynamic';

export default async function NewRequestPage({
  searchParams,
}: { searchParams: Promise<{ ids?: string; q?: string }> }) {
  const { ids, q } = await searchParams;
  const list = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const products = list.length ? getProducts(list) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950 dark:text-white">Request a quote</h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
          Field will confirm current availability, suitability and delivery.
        </p>
      </header>
      <QuoteForm products={products} query={q ?? ''} />
    </div>
  );
}
