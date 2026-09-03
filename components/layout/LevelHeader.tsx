import Link from 'next/link';
import { LEVELS, type Level } from '@/lib/levels.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';

/** Shared page header that keeps the four-level progression always visible. */
export function LevelHeader({ level, title, strap }: { level: Level; title?: string; strap?: string }) {
  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8">
        {/* Progression rail — current step is filled, the rest are hairlines. */}
        <nav className="mb-8 flex items-stretch gap-px overflow-hidden rounded-[2px] border border-ink-100 bg-ink-100">
          {LEVELS.map((l) => {
            const current = l.n === level.n;
            return (
              <Link
                key={l.slug}
                href={l.href}
                aria-current={current ? 'page' : undefined}
                className={`flex flex-1 items-baseline gap-2 px-3 py-2 transition-colors ${
                  current ? 'bg-signal-700 text-white' : 'bg-white text-ink-400 hover:bg-signal-50 hover:text-signal-600'
                }`}
              >
                <span className={`mono text-[10px] ${current ? 'text-signal-300' : 'text-ink-300'}`}>0{l.n}</span>
                <span className="text-[11px] font-semibold tracking-[0.08em]">{l.verb}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <span className="label">Level {level.n}</span>
              <span className="h-3 w-px bg-ink-200" />
              <DataBadge kind={level.dataKind} />
            </div>
            <h1 className="text-[28px] font-light leading-tight text-ink-950">
              {title ?? level.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">
              {strap ?? level.description}
            </p>
          </div>
          <p className="max-w-[15rem] shrink-0 text-right text-[11px] leading-relaxed text-ink-400">
            {level.dataLabel}
          </p>
        </div>
      </div>
    </header>
  );
}

/** "Why this matters" value panel (brief §15). Always labelled illustrative. */
export function ValuePanel({ items, note }: { items: Array<{ label: string; detail: string }>; note?: string }) {
  return (
    <section className="border border-ink-100 bg-white p-6">
      <h2 className="label">Why this matters</h2>
      <ul className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex gap-3">
            <span className="mt-[9px] h-px w-3 shrink-0 bg-signal-300" />
            <div>
              <p className="text-[13px] font-medium text-ink-800">{i.label}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{i.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="rule mt-6 pt-4 text-[11px] text-ink-400">
        {note ?? 'Illustrative opportunity — validate using Field operational data.'}
      </p>
    </section>
  );
}
