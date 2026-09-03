import Link from 'next/link';
import { LEVELS, type Level } from '@/lib/levels.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';

/** Shared page header that keeps the four-level progression always visible. */
export function LevelHeader({ level, title, strap }: { level: Level; title?: string; strap?: string }) {
  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav className="mb-4 flex flex-wrap items-center gap-1.5">
          {LEVELS.map((l) => (
            <Link
              key={l.slug}
              href={l.href}
              aria-current={l.n === level.n ? 'page' : undefined}
              className={`rounded-[3px] px-2.5 py-1 text-[11px] font-medium transition ${
                l.n === level.n
                  ? 'bg-signal-600 text-white'
                  : 'border border-ink-200 text-ink-500 hover:border-signal-300 hover:text-signal-600'
              }`}
            >
              <span className="mr-1.5 tabular-nums opacity-70">0{l.n}</span>
              {l.verb}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Level {level.n}
              </span>
              <DataBadge kind={level.dataKind} />
            </div>
            <h1 className="text-2xl font-light tracking-tight text-ink-950">
              {title ?? level.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-600">{strap ?? level.description}</p>
          </div>
          <p className="max-w-[16rem] text-right text-[11px] leading-relaxed text-ink-400">
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
    <section className="card p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        Why this matters
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label}>
            <p className="text-sm font-medium text-ink-800">{i.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{i.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">
        {note ?? 'Illustrative opportunity — validate using Field operational data.'}
      </p>
    </section>
  );
}
