'use client';

import Link from 'next/link';
import { DEMOS, demoBySlug } from '@/lib/demos.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';

/**
 * Chrome for a demonstration page: a slim bar, four plain tabs, a header that
 * says literally what this is, and nothing else. No metaphor to decode.
 */
export function DemoShell({
  demo,
  children,
}: {
  demo: string;
  children: React.ReactNode;
}) {
  const current = demoBySlug(demo)!;
  const idx = DEMOS.findIndex((d) => d.slug === demo);
  const next = DEMOS[idx + 1] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* ------------------------------------------------------------- bar */}
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[12px] font-medium tracking-tight text-ink-800">
              Field AI Opportunity Lab
            </span>
          </Link>
          <Link
            href="/explore"
            className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600"
          >
            The full platform →
          </Link>
        </div>

        {/* ------------------------------------------------------------ tabs */}
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-1 px-5 sm:px-8">
          {DEMOS.map((d) => (
            <Link
              key={d.slug}
              href={d.href}
              aria-current={d.slug === demo ? 'page' : undefined}
              className={`border-b-2 pb-2 text-[12px] transition-colors ${
                d.slug === demo
                  ? 'border-signal-600 font-medium text-signal-700'
                  : 'border-transparent text-ink-400 hover:text-signal-600'
              }`}
            >
              {d.short}
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ head */}
      <header className="relative overflow-hidden bg-signal-800 text-white">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <DataBadge kind={current.dataKind} />
            <span className="mono text-[10px] tracking-[0.12em] text-signal-300">
              COMPLEXITY · {current.complexityLabel.toUpperCase()}
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-light leading-tight text-white sm:text-[30px]">
            {current.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] font-light leading-relaxed text-signal-100/90">
            {current.what}
          </p>
        </div>
      </header>

      {/* --------------------------------------------------------- content */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-5 py-9 sm:px-8">
        {children}
      </div>

      {/* ------------------------------------------------------------ foot */}
      <div className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="text-[12px] text-ink-400 transition-colors hover:text-signal-600">
            ← All four demos
          </Link>
          {next ? (
            <Link
              href={next.href}
              className="ml-auto rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600"
            >
              Next demo — {next.short} →
            </Link>
          ) : (
            <Link
              href="/explore"
              className="ml-auto rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600"
            >
              The full platform →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function Mark() {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[2px] bg-signal-700">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" aria-hidden="true">
        <path d="M10 2.2 17.2 10 10 17.8 2.8 10z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".55" />
        <path d="M10 5.6 14.2 10 10 14.4 5.8 10z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.35" fill="currentColor" />
      </svg>
    </span>
  );
}

/** Priming card — set attention before a demonstration runs. */
export function WatchFor({ points }: { points: string[] }) {
  return (
    <aside className="mb-6 border-l-2 border-signal-200 bg-white py-3.5 pl-4 pr-4">
      <p className="label mb-2.5">Worth watching for</p>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-600">
            <span className="mt-[8px] h-px w-2.5 shrink-0 bg-signal-400" />
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Closing observation — technical, not promotional. */
export function Beat({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticked mt-8 border border-ink-100 bg-white px-5 py-4">
      <p className="text-[13.5px] font-light leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}
