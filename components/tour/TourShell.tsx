'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { TOUR, chapterBySlug } from '@/lib/tour.ts';

/**
 * Chrome for a tour chapter: a slim bar, a waypoint rail, and exactly one
 * forward action. Keyboard arrows work; clicking a waypoint allows skipping —
 * guidance, not captivity.
 */
export function TourShell({
  chapter,
  width = 'narrow',
  continueLabel,
  children,
}: {
  chapter: string;
  width?: 'narrow' | 'wide';
  continueLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const current = chapterBySlug(chapter)!;
  const prev = TOUR.find((c) => c.n === current.n - 1) ?? null;
  const next = TOUR.find((c) => c.n === current.n + 1) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === 'ArrowRight' && next) router.push(next.href);
      if (e.key === 'ArrowLeft') router.push(prev ? prev.href : '/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, prev, next]);

  // Prefetch the next chapter so Continue is instant.
  useEffect(() => {
    if (next) router.prefetch(next.href);
  }, [router, next]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* ------------------------------------------------------------- bar */}
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-[2px] bg-signal-700">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" aria-hidden="true">
                <path d="M10 2.2 17.2 10 10 17.8 2.8 10z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".55" />
                <path d="M10 5.6 14.2 10 10 14.4 5.8 10z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="1.35" fill="currentColor" />
              </svg>
            </span>
            <span className="text-[12px] font-medium tracking-tight text-ink-800">
              Field AI Opportunity Lab
            </span>
          </Link>
          <Link
            href="/explore"
            className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600"
          >
            Exit tour — explore freely →
          </Link>
        </div>

        {/* ------------------------------------------------------ waypoints */}
        <div className="mx-auto max-w-5xl px-5 pb-3 sm:px-8">
          <ol className="flex items-center">
            {TOUR.map((c, i) => {
              const state = c.n < current.n ? 'done' : c.n === current.n ? 'current' : 'ahead';
              return (
                <li key={c.slug} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className={`mx-1.5 h-px flex-1 ${state === 'ahead' ? 'bg-ink-100' : 'bg-signal-300'}`}
                    />
                  )}
                  <Link href={c.href} className="group flex shrink-0 items-center gap-1.5">
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full border text-[8px] font-semibold transition-colors ${
                        state === 'current'
                          ? 'border-signal-700 bg-signal-700 text-white'
                          : state === 'done'
                            ? 'border-signal-300 bg-signal-100 text-signal-600'
                            : 'border-ink-200 bg-white text-ink-300 group-hover:border-signal-300'
                      }`}
                    >
                      {c.n}
                    </span>
                    <span
                      className={`hidden text-[10px] font-semibold uppercase tracking-[0.08em] sm:inline ${
                        state === 'current' ? 'text-signal-700' : state === 'done' ? 'text-signal-400' : 'text-ink-300'
                      }`}
                    >
                      {c.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ----------------------------------------------------------- content */}
      <div className={`mx-auto w-full flex-1 px-5 py-10 sm:px-8 ${width === 'wide' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {children}
      </div>

      {/* -------------------------------------------------------------- foot */}
      <div className="border-t border-ink-100 bg-white">
        <div className={`mx-auto flex w-full items-center gap-4 px-5 py-4 sm:px-8 ${width === 'wide' ? 'max-w-5xl' : 'max-w-3xl'}`}>
          <Link
            href={prev ? prev.href : '/'}
            className="text-[12px] text-ink-400 transition-colors hover:text-signal-600"
          >
            ← {prev ? prev.label : 'Beginning'}
          </Link>
          <span className="mono ml-auto hidden text-[10px] text-ink-300 sm:inline">
            {current.n} / {TOUR.length} · press → to continue
          </span>
          {next ? (
            <Link
              href={next.href}
              className="ml-auto rounded-[2px] bg-action-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-action-500 sm:ml-0"
            >
              {continueLabel ?? `Continue — ${next.label.toLowerCase()}`} →
            </Link>
          ) : (
            <Link
              href="/explore"
              className="ml-auto rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600 sm:ml-0"
            >
              Explore the full platform →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Chapter heading: eyebrow + light display line + lede. */
export function ChapterHead({
  n, label, title, lede,
}: { n: number; label: string; title: string; lede?: React.ReactNode }) {
  return (
    <header className="step-in mb-8">
      <div className="flex items-center gap-3">
        <span className="mono text-[11px] text-signal-400">
          {String(n).padStart(2, '0')}
        </span>
        <span className="h-px w-6 bg-signal-300" />
        <span className="label !text-signal-600">{label}</span>
      </div>
      <h1 className="mt-4 text-[30px] font-light leading-[1.12] text-ink-950 sm:text-[36px]">
        {title}
      </h1>
      {lede && (
        <div className="mt-4 max-w-2xl text-[14.5px] font-light leading-relaxed text-ink-600">
          {lede}
        </div>
      )}
    </header>
  );
}

/** Priming card: "worth watching for" — set attention before the demo runs. */
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

/** Closing beat of a chapter — the one sentence he should carry forward. */
export function Beat({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticked mt-8 border border-ink-100 bg-white px-5 py-4">
      <p className="text-[13.5px] font-light leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}
