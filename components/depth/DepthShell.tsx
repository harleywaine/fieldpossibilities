'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { STRATA, stratumBySlug, DEPTH_BANDS } from '@/lib/depth.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';

/**
 * Chrome for a stratum: a slim bar, a fixed depth gauge down the left, and
 * spatial movement — descend, ascend, or jump anywhere on the gauge. Arrow
 * keys move vertically, because the site is a section drawing, not a slideshow.
 */
export function DepthShell({
  stratum,
  width = 'wide',
  children,
}: {
  stratum: string;
  width?: 'narrow' | 'wide';
  children: React.ReactNode;
}) {
  const router = useRouter();
  const idx = STRATA.findIndex((s) => s.slug === stratum);
  const current = STRATA[idx];
  const above = STRATA[idx - 1] ?? null;
  const below = STRATA[idx + 1] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && below) {
        e.preventDefault();
        router.push(below.href);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        router.push(above ? above.href : '/');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, above, below]);

  useEffect(() => {
    if (below) router.prefetch(below.href);
    if (above) router.prefetch(above.href);
  }, [router, above, below]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* ------------------------------------------------------------- bar */}
      <div className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-5 sm:px-8">
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
        {/* Compact gauge for small screens. */}
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-5 pb-2.5 sm:px-8 lg:hidden">
          {STRATA.map((s) => (
            <Link
              key={s.slug}
              href={s.href}
              className={`mono flex-1 border-b-2 pb-1 text-center text-[10px] tracking-[0.08em] transition-colors ${
                s.slug === stratum
                  ? 'border-signal-600 text-signal-700'
                  : 'border-ink-100 text-ink-300 hover:text-signal-500'
              }`}
            >
              {s.mark}
            </Link>
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------- head band */}
      <header
        className="relative overflow-hidden text-white"
        style={{ background: DEPTH_BANDS[stratum] ?? '#0a2545' }}
      >
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        {/* Watermark depth numeral — quiet, enormous, technical. */}
        <span
          aria-hidden="true"
          className="mono pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 select-none text-[9rem] font-medium leading-none text-white/[0.05]"
        >
          {current.mark}
        </span>
        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:pl-28">
          <div className="flex flex-wrap items-center gap-3">
            <span className="mono text-[11px] tracking-[0.14em] text-signal-300">
              DEPTH {current.mark}
            </span>
            <span className="h-3 w-px bg-white/20" />
            <DataBadge kind={current.dataKind} />
          </div>
          <h1 className="mt-3 text-[30px] font-light leading-[1.1] text-white sm:text-[36px]">
            {current.name}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] font-light leading-relaxed text-signal-100/90">
            {current.line}
          </p>
        </div>
      </header>

      {/* -------------------------------------------- gauge + content region */}
      <div className="relative mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8">
        <DepthGauge current={stratum} />
        <div className={`py-10 lg:pl-28 ${width === 'narrow' ? 'lg:pr-40' : ''}`}>
          {children}
        </div>
      </div>

      {/* ------------------------------------------------------------- foot */}
      <div className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-4 sm:px-8 lg:pl-28">
          <Link
            href={above ? above.href : '/'}
            className="text-[12px] text-ink-400 transition-colors hover:text-signal-600"
          >
            ↑ {above ? `${above.mark} · ${above.name}` : '00 · The surface'}
          </Link>
          {below ? (
            <Link
              href={below.href}
              className="ml-auto rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600"
            >
              Descend · {below.mark} {below.name} ↓
            </Link>
          ) : (
            <Link
              href="/"
              className="ml-auto rounded-[2px] bg-signal-700 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-signal-600"
            >
              ↑ Return to the surface
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The instrument: a fixed vertical gauge, simple at the top, complex at the
 * bottom, every stratum reachable from anywhere.
 */
function DepthGauge({ current }: { current: string }) {
  return (
    <nav
      aria-label="Depth"
      className="absolute bottom-0 left-8 top-0 hidden w-20 lg:block"
    >
      <div className="sticky top-24 pt-10">
        <p className="mono mb-3 text-[9px] tracking-[0.2em] text-ink-300">SIMPLE</p>
        <div className="relative ml-[3px] border-l border-ink-200 pl-4">
          <ol className="space-y-7">
            {STRATA.map((s) => {
              const active = s.slug === current;
              return (
                <li key={s.slug} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[21.5px] top-[3px] h-[9px] w-[9px] rotate-45 border transition-colors ${
                      active ? 'border-signal-700 bg-signal-700' : 'border-ink-300 bg-ink-50'
                    }`}
                  />
                  <Link href={s.href} className="group block">
                    <span className={`mono block text-[10px] ${active ? 'text-signal-700' : 'text-ink-300 group-hover:text-signal-500'}`}>
                      {s.mark}
                    </span>
                    <span
                      className={`block text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        active ? 'text-signal-700' : 'text-ink-400 group-hover:text-signal-600'
                      }`}
                    >
                      {s.name.replace('The ', '')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mono mt-3 text-[9px] tracking-[0.2em] text-ink-300">COMPLEX</p>
      </div>
    </nav>
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
