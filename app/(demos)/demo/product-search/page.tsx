import type { Metadata } from 'next';
import { DemoShell, Beat } from '@/components/demos/DemoShell.tsx';
import { AutoSearch } from '@/components/demos/AutoSearch.tsx';

export const metadata: Metadata = { title: 'AI product search — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function ProductSearchDemo() {
  return (
    <DemoShell demo="product-search">
      <p className="mb-5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
        It demonstrates itself first — the question below is being asked for real, against the
        ingested catalogue. When it finishes, the box is yours.
      </p>
      <AutoSearch />
      <Beat>
        Those are real part numbers from Field’s published catalogue, each with the evidence for
        the match and an honest note about what the catalogue doesn’t establish. The customer
        never needed to know part numbering, taxonomy or product naming — and every result links
        back to fieldinternational.com so anything can be verified.
      </Beat>
    </DemoShell>
  );
}
