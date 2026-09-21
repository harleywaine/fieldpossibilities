import Link from 'next/link';
import type { Metadata } from 'next';
import { DEMOS, type Demo } from '@/lib/demos.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';
import { Mark } from '@/components/demos/DemoShell.tsx';
import { Sphere, SPHERE_POINTS, SPHERE_RATE } from '@/components/demos/Sphere.tsx';
import { loadMetrics } from '@/lib/roi/model.ts';
import { catalogueStats } from '@/lib/db/client.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'AI, applied to four processes. Working demonstrations, not slides.',
};

/**
 * The front door as a drawing sheet: a full-viewport blueprint stage with the
 * four demonstrations at its four corners, a point-cloud sphere as the focal
 * instrument, and tiny self-annotations whose values are real. The content is
 * unchanged from the quadrant page — literal titles, two honest indicators —
 * only staged. Detail sits one scroll below; small screens get the panel
 * directly.
 */
export default function StagePage() {
  let metrics = new Map<string, { before: number; after: number }>();
  try {
    metrics = new Map(
      loadMetrics().map((m: any) => [
        String(m.process),
        { before: Number(m.current_minutes), after: Number(m.ai_assisted_minutes) },
      ]),
    );
  } catch { /* dataset not generated */ }
  const mins = (d: Demo) => metrics.get(d.metricProcess) ?? d.fallbackMinutes;

  let products: number | null = null;
  try { products = catalogueStats().products; } catch { /* pre-ingestion */ }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Power-on. Pure CSS, plays once, skipped for reduced motion. */}
      <div className="boot" aria-hidden="true"><Mark /></div>

      {/* ------------------------------------------------------------- bar */}
      <div className="relative z-10 border-b border-ink-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-13 max-w-7xl items-center px-5 py-3 sm:px-8">
          <span className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[12px] font-medium tracking-tight text-ink-800">
              Field AI Opportunity Lab
            </span>
          </span>
          <span className="label ml-6 hidden md:inline">Prepared for Field International</span>
          <Link
            href="/explore"
            className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600"
          >
            The full platform →
          </Link>
        </div>
      </div>

      {/* ----------------------------------------------------------- stage */}
      <section className="grid-bg-light ticked relative hidden min-h-[640px] flex-col lg:flex lg:h-[calc(100vh-53px)] lg:max-h-[900px]">
        {/* Corner annotations — the four demonstrations. */}
        <Corner demo={DEMOS[0]} minutes={mins(DEMOS[0])} pos="left-[6%] top-[16%]" />
        <Corner demo={DEMOS[1]} minutes={mins(DEMOS[1])} pos="right-[6%] top-[16%]" align="right" />
        <Corner demo={DEMOS[2]} minutes={mins(DEMOS[2])} pos="left-[6%] bottom-[18%]" />
        <Corner demo={DEMOS[3]} minutes={mins(DEMOS[3])} pos="right-[6%] bottom-[18%]" align="right" />

        {/* Centre: split display type around the instrument. */}
        <div className="flex flex-1 items-center justify-center gap-10 px-8 xl:gap-16">
          <span className="step-in text-right text-[3rem] font-light leading-none tracking-[0.28em] text-ink-900 xl:text-[3.6rem]" style={{ animationDelay: '650ms' }}>
            FOUR
          </span>
          <div className="relative shrink-0" >
            <Sphere size={340} />
            <span className="annot absolute -right-6 top-6 rotate-90 whitespace-nowrap">
              pts: {SPHERE_POINTS} · {SPHERE_RATE} rad/s
            </span>
            <span className="annot absolute -left-10 bottom-8 whitespace-nowrap">
              grid: 56px · mock-ups: 0
            </span>
          </div>
          <span className="step-in text-[3rem] font-light leading-none tracking-[0.28em] text-ink-900 xl:text-[3.6rem]" style={{ animationDelay: '800ms' }}>
            DEMOS
          </span>
        </div>

        {/* The literal line, beneath the instrument. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[9%] text-center">
          <p className="step-in mx-auto max-w-xl text-[13px] font-light leading-relaxed text-ink-500" style={{ animationDelay: '950ms' }}>
            AI, applied to four processes — each one a working demonstration.
            {products ? ` The first runs on all ${products.toLocaleString()} products of Field’s published catalogue;` : ' The first runs on Field’s published catalogue;'}
            {' '}the rest on labelled synthetic records.
          </p>
          <p className="annot mt-3">SCROLL FOR DETAIL ↓</p>
        </div>

        <div className="ruler absolute inset-x-0 bottom-0" aria-hidden="true" />
      </section>

      {/* ------------------------------------------- small screens: masthead */}
      <section className="field-banner relative overflow-hidden lg:hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-10 pt-8">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-signal-300">
            PREPARED FOR FIELD INTERNATIONAL
          </p>
          <h1 className="mt-4 text-[2rem] font-light leading-[1.08] text-white">
            AI, applied to four processes.
          </h1>
          <p className="mt-3 max-w-2xl text-[13.5px] font-light leading-relaxed text-signal-100">
            Each one is a working demonstration, not a slide. The first runs on Field’s real
            published catalogue; the others on clearly-labelled synthetic records.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------- the detail panel */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
        <div className="mb-6 hidden items-center gap-3 lg:flex">
          <span className="h-px w-8 bg-signal-400" />
          <p className="label">The four, in detail</p>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200 md:grid-cols-2">
          {DEMOS.map((d, i) => (
            <Quadrant key={d.slug} demo={d} index={i} minutes={mins(d)} />
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

/** A corner of the stage: number, literal title, the two figures, a door. */
function Corner({
  demo, minutes, pos, align = 'left',
}: { demo: Demo; minutes: { before: number; after: number }; pos: string; align?: 'left' | 'right' }) {
  const saving = Math.round((1 - minutes.after / minutes.before) * 100);
  return (
    <Link
      href={demo.href}
      className={`group absolute z-10 block max-w-[19rem] ${pos} ${align === 'right' ? 'text-right' : ''}`}
    >
      <span className={`flex items-baseline gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        <span className="mono text-[11px] text-signal-400">0{DEMOS.indexOf(demo) + 1}.</span>
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.09em] text-ink-800 transition-colors group-hover:text-signal-600">
          {demo.title.replace('AI applied to ', 'AI applied to ')}
        </span>
      </span>
      <span className={`mono mt-1.5 block text-[10px] tracking-[0.06em] text-ink-400 ${align === 'right' ? '' : ''}`}>
        BUILD {demo.complexityLabel.toUpperCase()} · {minutes.before}→{minutes.after} MIN ({saving < 0 ? '' : '−'}{Math.abs(saving)}%)
      </span>
      <span className={`mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-action-600 opacity-0 transition-opacity group-hover:opacity-100 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        Open <span aria-hidden="true">→</span>
      </span>
    </Link>
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

      <div className="rule mt-5 grid grid-cols-2 gap-6 pt-4">
        <div>
          <p className="label">Complexity to build</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex gap-1">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-[7px] w-5 rounded-[1px] ${n <= demo.complexity ? 'bg-signal-600' : 'bg-ink-100'}`}
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
