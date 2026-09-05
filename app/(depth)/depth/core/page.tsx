import Link from 'next/link';
import type { Metadata } from 'next';
import { DepthShell } from '@/components/depth/DepthShell.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { RoiCalculator } from '@/components/roi/RoiCalculator.tsx';
import { computeRoi, recommendFirstPhase } from '@/lib/roi/model.ts';
import { STRATA } from '@/lib/depth.ts';

export const metadata: Metadata = { title: '−03 The core — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

/**
 * The deepest layer: everything connected. Not a sales close — an instrument
 * panel and a map of the whole machine, with one quiet line about what
 * happens next.
 */
export default function CoreStratum() {
  let roi = null;
  let rec = null;
  try {
    roi = computeRoi();
    rec = recommendFirstPhase(roi);
  } catch { /* dataset not generated */ }

  return (
    <DepthShell stratum="core">
      <SyntheticNotice>
        The volumes and process times in this layer are synthetic estimates — the arithmetic is
        the part that matters. Rerun on real figures, the numbers change; the shape of the model
        doesn’t.
      </SyntheticNotice>

      {/* ------------------------------------------------ what connects to what */}
      <section>
        <p className="label mb-3">One machine, in section</p>
        <ol className="grid gap-px overflow-hidden rounded-[2px] border border-ink-100 bg-ink-100 md:grid-cols-4">
          {STRATA.map((s) => (
            <li key={s.slug} className="flex flex-col bg-white p-4">
              <span className="mono text-[10px] text-signal-400">{s.mark}</span>
              <span className="mt-1.5 text-[13px] font-medium text-ink-900">{s.name}</span>
              <span className="rule mt-3 pt-2.5 text-[11px] leading-relaxed text-ink-500">
                {s.line}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Each layer stands on the one above it. The surface needs nothing but public data; the
          core needs everything — which is exactly why you build from the top down
          {rec ? <>, and why the model below puts <span className="font-medium text-ink-700">{rec.process}</span> first</> : null}.
        </p>
      </section>

      {/* ------------------------------------------------------- the instrument */}
      <section className="mt-10">
        <p className="label mb-3">The instrument — move it</p>
        {roi ? (
          <RoiCalculator initial={roi} compact />
        ) : (
          <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
        )}
      </section>

      {/* ------------------------------------------------------------ the line */}
      <section className="ticked mt-10 border border-ink-100 bg-white px-6 py-6">
        <p className="max-w-2xl text-[14px] font-light leading-relaxed text-ink-700">
          Everything above this line was built from Field’s public catalogue alone — no access, no
          integrations, no meetings. When you want it pointed at the real thing, reply to the
          message this link arrived in.
        </p>
      </section>

      {/* ------------------------------------------------------ deeper reading */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <IndexGroup
          title="Walk the layers in full"
          items={[
            { href: '/customer-ai', label: 'The surface, complete', note: 'Products, comparison, quoting — the whole customer experience.' },
            { href: '/knowledge-ai', label: 'The interior, unscripted', note: 'Ask the synthetic records anything.' },
            { href: '/workflow-ai', label: 'The workings, in detail', note: 'The exception queue and the work package.' },
            { href: '/roi', label: 'The full model', note: 'Every assumption exposed and adjustable, per process.' },
          ]}
        />
        <IndexGroup
          title="The engineering"
          items={[
            { href: '/architecture', label: 'Architecture', note: 'How each layer is built, and the principles that keep it honest.' },
            { href: '/ingestion', label: 'Ingestion report', note: 'The catalogue crawl: coverage, field population, data quality.' },
            { href: '/catalogue', label: 'The raw catalogue', note: 'The conventional faceted view over the same data.' },
            { href: '/operating-layer', label: 'The operating layer', note: 'The operations brief and the phased roadmap.' },
          ]}
        />
      </section>
    </DepthShell>
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
