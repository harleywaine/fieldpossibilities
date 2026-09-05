import Link from 'next/link';
import type { Metadata } from 'next';
import { DEMOS, type Demo } from '@/lib/demos.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';
import { Mark } from '@/components/demos/DemoShell.tsx';
import { loadMetrics } from '@/lib/roi/model.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'AI, applied to four processes. Working demonstrations, not slides.',
};

/**
 * The front door: four quadrants, each saying literally what it does. Two
 * instruments per quadrant — how hard it is to build, what it does to the time
 * the process takes — and a door. Nothing to decode, nothing being sold.
 */
export default function DemosPage() {
  // Efficiency figures come from the same metrics table the model uses.
  let metrics = new Map<string, { before: number; after: number }>();
  try {
    metrics = new Map(
      loadMetrics().map((m: any) => [
        String(m.process),
        { before: Number(m.current_minutes), after: Number(m.ai_assisted_minutes) },
      ]),
    );
  } catch { /* dataset not generated — fall back to registry values */ }

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* -------------------------------------------------------- masthead */}
      <section className="field-banner relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto flex h-14 w-full max-w-5xl items-center px-5 sm:px-8">
          <span className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[12px] font-medium tracking-tight text-white/90">
              Field AI Opportunity Lab
            </span>
          </span>
          <Link
            href="/explore"
            className="ml-auto text-[11px] text-signal-300 transition-colors hover:text-white"
          >
            The full platform →
          </Link>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-signal-300/70" />
            <p className="text-[10px] font-semibold tracking-[0.18em] text-signal-300">
              PREPARED FOR FIELD INTERNATIONAL
            </p>
          </div>
          <h1 className="mt-5 text-[2.2rem] font-light leading-[1.08] text-white sm:text-[2.8rem]">
            AI, applied to four processes.
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] font-light leading-relaxed text-signal-100">
            Each one is a working demonstration, not a slide. The first runs on Field’s real
            published catalogue; the others on clearly-labelled synthetic records.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- quadrants */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">
        <div className="grid gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200 md:grid-cols-2">
          {DEMOS.map((d, i) => (
            <Quadrant
              key={d.slug}
              demo={d}
              index={i}
              minutes={metrics.get(d.metricProcess) ?? d.fallbackMinutes}
            />
          ))}
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
          Time-per-task figures are illustrative estimates from the demonstration model — every
          assumption behind them is exposed and adjustable in{' '}
          <Link href="/roi" className="text-signal-600 underline decoration-dotted underline-offset-[3px] hover:text-action-600">
            the model itself
          </Link>
          . Only the product-search demonstration uses real Field data.
        </p>
      </section>
    </div>
  );
}

function Quadrant({ demo, index, minutes }: { demo: Demo; index: number; minutes: { before: number; after: number } }) {
  const saving = Math.round((1 - minutes.after / minutes.before) * 100);
  return (
    <Link href={demo.href} className="group flex flex-col bg-white p-6 transition-colors hover:bg-signal-50 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <span className="mono text-[11px] text-ink-300">0{index + 1}</span>
        <DataBadge kind={demo.dataKind} />
      </div>

      <h2 className="mt-4 text-[18px] font-medium leading-snug text-ink-900 transition-colors group-hover:text-signal-700">
        {demo.title}
      </h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-500">{demo.what}</p>

      {/* ----------------------------------------------------- instruments */}
      <div className="rule mt-5 grid grid-cols-2 gap-6 pt-4">
        <div>
          <p className="label">Complexity to build</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex gap-1">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-[7px] w-5 rounded-[1px] ${
                    n <= demo.complexity ? 'bg-signal-600' : 'bg-ink-100'
                  }`}
                />
              ))}
            </span>
            <span className="text-[11.5px] font-medium text-ink-700">{demo.complexityLabel}</span>
          </div>
        </div>
        <div>
          <p className="label">Time per task</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="mono figure text-[13px] text-ink-700">
              {minutes.before} <span className="text-ink-300">→</span> {minutes.after} min
            </span>
            <span className="mono text-[11px] font-medium text-[color:var(--color-strong-600)]">
              −{saving}%
            </span>
          </div>
        </div>
      </div>

      <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-action-600 transition-colors group-hover:text-action-500">
        Open the demo
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
