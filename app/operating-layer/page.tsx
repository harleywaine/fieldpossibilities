import Link from 'next/link';
import { levelBySlug, LEVELS } from '@/lib/levels.ts';
import { LevelHeader } from '@/components/layout/LevelHeader.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { computeRoi, recommendFirstPhase, ROI_DISCLAIMER } from '@/lib/roi/model.ts';
import { AIBadge } from '@/components/ui/primitives.tsx';
import { demoAvailable } from '@/lib/db/demo.ts';

export const dynamic = 'force-dynamic';

const gbp = (n: number) => `£${Math.round(n).toLocaleString()}`;

export default function OperatingLayerPage() {
  const level = levelBySlug('operating-layer')!;
  if (!demoAvailable()) {
    return (
      <div>
        <LevelHeader level={level} />
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="card p-6">
            <h2 className="text-base font-medium">Synthetic dataset not generated</h2>
            <p className="mt-2 text-sm text-ink-600">
              Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run generate-demo-data</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const roi = computeRoi();
  const rec = recommendFirstPhase(roi);

  return (
    <div>
      <LevelHeader
        level={level}
        title="AI Operating Layer"
        strap="From individual workflows to business-wide intelligence."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <SyntheticNotice>
          The operational dataset behind this analysis is entirely synthetic. It models process
          volumes and durations for a business of Field’s type; it does not measure Field’s actual
          operation.
        </SyntheticNotice>

        {/* --------------------------------------------- executive question */}
        <section className="card p-5">
          <p className="label">
            Executive question
          </p>
          <p className="mt-2 text-[19px] font-light leading-snug text-ink-900">
            “Where are we losing time and money in our current operation?”
          </p>
        </section>

        {/* ------------------------------------------------------- the brief */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-medium text-ink-900">AI Operations Brief</h2>
            <AIBadge provider="deterministic-model" />
          </div>

          <div className="rounded-[2px] border border-signal-600/25 bg-signal-600/5 p-5">
            <p className="label">
              Estimated annual productivity opportunity
            </p>
            <p className="figure mt-2 text-[2.75rem] font-light leading-none text-signal-700">
              {gbp(roi.totals.productivityValueGbp)}
            </p>
            <p className="mt-1.5 text-xs text-ink-500">
              {roi.totals.annualHoursRecovered.toLocaleString()} employee hours ·
              about {roi.totals.fteEquivalent} full-time equivalent ·
              {' '}{roi.inputs.adoptionRatePct}% adoption assumed
            </p>
            <p className="mt-3 border-t border-signal-600/15 pt-3 text-[11px] text-[color:var(--color-caution-600)]">
              {ROI_DISCLAIMER}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {roi.opportunities.map((o) => (
              <div key={o.process} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-ink-900">{o.process}</h3>
                    <p className="text-xs text-ink-400">
                      {o.currentMinutes} min → {o.aiAssistedMinutes} min ·
                      {' '}{o.annualVolume.toLocaleString()} per year · {o.complexity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold figure text-signal-700">
                      {gbp(o.productivityValueGbp)}
                    </p>
                    <p className="text-[11px] text-ink-400">{o.annualHoursRecovered.toLocaleString()} hours</p>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-signal-500" style={{ width: `${o.sharePct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/roi"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-action-600 transition-colors hover:gap-2.5"
          >
            Change the assumptions in the ROI model <span aria-hidden="true">→</span>
          </Link>
        </section>

        {/* --------------------------------------------------- recommendation */}
        <section className="mt-10">
          <p className="label">
            Executive question
          </p>
          <p className="mt-2 text-[19px] font-light leading-snug text-ink-900">“What should we implement first?”</p>

          <div className="mt-3 rounded-[2px] border border-action-600/25 bg-action-600/5 p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-medium text-ink-900">Start with {rec.process}</h3>
              <AIBadge provider="deterministic-model" />
            </div>
            <p className="text-sm leading-relaxed text-ink-700">{rec.reason}</p>
          </div>

          <ol className="mt-4 space-y-2">
            {rec.ranked.slice(1, 4).map((o, i) => (
              <li key={o.process} className="card flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
                <span className="text-[11px] font-semibold figure text-ink-400">
                  Then {i + 2}
                </span>
                <span className="text-sm font-medium text-ink-800">{o.process}</span>
                <span className="ml-auto text-xs tabular-nums text-signal-700">
                  {gbp(o.productivityValueGbp)}
                </span>
                <span className="text-[11px] text-ink-400">{o.complexity}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------- roadmap */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-medium text-ink-900">Implementation roadmap</h2>
          <div className="space-y-2">
            {LEVELS.map((l, i) => (
              <article key={l.slug} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[2px] bg-signal-600/10 px-2 py-0.5 text-[11px] font-semibold text-signal-600">
                    {['NOW', 'NEXT', 'THEN', 'FUTURE'][i]}
                  </span>
                  <h3 className="text-sm font-medium text-ink-900">{l.title}</h3>
                  <Link href={l.href} className="ml-auto text-xs text-signal-600 underline underline-offset-2">
                    View demo
                  </Link>
                </div>
                <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-ink-400">Data required</dt>
                    <dd className="mt-0.5 text-ink-700">{PHASE_DETAIL[i].data}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Systems required</dt>
                    <dd className="mt-0.5 text-ink-700">{PHASE_DETAIL[i].systems}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Complexity / risk</dt>
                    <dd className="mt-0.5 text-ink-700">{l.complexity} / {PHASE_DETAIL[i].risk}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-400">Human oversight</dt>
                    <dd className="mt-0.5 text-ink-700">{PHASE_DETAIL[i].oversight}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="mt-12 rounded-[2px] border border-signal-600/25 bg-signal-600/5 p-6">
          <h2 className="text-xl font-light text-ink-950">
            Find Field’s highest-value AI opportunities
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
            The next step would be to map Field’s real workflows, systems and data to identify where
            AI can deliver the greatest measurable return — replacing the synthetic assumptions in
            this model with Field’s own operational figures.
          </p>
          <span className="mt-4 inline-block rounded-[2px] bg-action-600 px-5 py-2.5 text-sm font-medium text-white">
            Build an AI Opportunity Map
          </span>
        </section>
      </div>
    </div>
  );
}

const PHASE_DETAIL = [
  { data: 'Public catalogue only', systems: 'None — read-only ingestion', risk: 'Low', oversight: 'Customer-facing claims are evidenced and bounded' },
  { data: 'Internal documents and email', systems: 'Document stores, mail', risk: 'Medium — permissions', oversight: 'Employee reviews every generated response' },
  { data: 'Enquiries, CRM, supplier records', systems: 'CRM, mail, catalogue', risk: 'Medium–high — process change', oversight: 'Exceptions and all commitments routed to people' },
  { data: 'Cross-functional operational data', systems: 'CRM, ERP, finance, documents', risk: 'High — integration breadth', oversight: 'Advisory only; humans make every decision' },
];
