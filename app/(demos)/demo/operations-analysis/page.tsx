import Link from 'next/link';
import type { Metadata } from 'next';
import { DemoShell } from '@/components/demos/DemoShell.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { RoiCalculator } from '@/components/roi/RoiCalculator.tsx';
import { computeRoi } from '@/lib/roi/model.ts';

export const metadata: Metadata = { title: 'AI operations analysis — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function OperationsAnalysisDemo() {
  let roi = null;
  try { roi = computeRoi(); } catch { /* dataset not generated */ }

  return (
    <DemoShell demo="operations-analysis">
      <SyntheticNotice>
        The volumes and process times here are synthetic estimates — the arithmetic is the part
        that matters. Rerun on real figures, the numbers change; the model doesn’t.
      </SyntheticNotice>

      {roi ? (
        <RoiCalculator initial={roi} compact />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}

      <section className="ticked mt-10 border border-ink-100 bg-white px-6 py-6">
        <p className="max-w-2xl text-[14px] font-light leading-relaxed text-ink-700">
          Everything in these four demonstrations was built from Field’s public catalogue alone —
          no access, no integrations, no meetings. When you want it pointed at the real thing,
          reply to the message this link arrived in.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <IndexGroup
          title="Each demo, in full"
          items={[
            { href: '/customer-ai', label: 'Product search, complete', note: 'Products, comparison, quoting — the whole customer experience.' },
            { href: '/knowledge-ai', label: 'Enquiry research, unscripted', note: 'Ask the synthetic records anything.' },
            { href: '/workflow-ai', label: 'RFQ processing, in detail', note: 'The exception queue and the work package.' },
            { href: '/roi', label: 'The full model', note: 'Every assumption exposed and adjustable, per process.' },
          ]}
        />
        <IndexGroup
          title="The engineering"
          items={[
            { href: '/architecture', label: 'Architecture', note: 'How each demo is built, and the principles that keep it honest.' },
            { href: '/ingestion', label: 'Ingestion report', note: 'The catalogue crawl: coverage, field population, data quality.' },
            { href: '/catalogue', label: 'The raw catalogue', note: 'The conventional faceted view over the same data.' },
            { href: '/operating-layer', label: 'The operating layer', note: 'The operations brief and the phased roadmap.' },
          ]}
        />
      </section>
    </DemoShell>
  );
}

function IndexGroup({
  title, items,
}: { title: string; items: Array<{ href: string; label: string; note: string }> }) {
  return (
    <div className="card p-5">
      <p className="label mb-3">{title}</p>
      <ul className="divide-y divide-ink-100">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group flex items-baseline gap-3 py-2.5">
              <span className="text-[13px] font-medium text-signal-600 transition-colors group-hover:text-action-600">
                {i.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-400">{i.note}</span>
              <span aria-hidden="true" className="text-[11px] text-ink-300 transition-colors group-hover:text-action-600">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
