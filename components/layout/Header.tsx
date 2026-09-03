import Link from 'next/link';

const NAV = [
  { href: '/search', label: 'AI search' },
  { href: '/catalogue', label: 'Browse catalogue' },
  { href: '/requests', label: 'Quote requests' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/ingestion', label: 'Ingestion' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid h-7 w-7 place-items-center rounded-[3px] bg-signal-600 text-white">
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M8 1.5 14 8l-6 6.5L2 8z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <circle cx="8" cy="8" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[15px] font-medium tracking-tight text-signal-700">
            Field Tooling Intelligence
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-[3px] px-3 py-1.5 text-sm text-signal-600 transition hover:bg-ink-50 hover:text-action-600"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <span className="ml-auto rounded-full bg-caution-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-caution-600)] ring-1 ring-inset ring-[color:var(--color-caution-600)]/25 [color:var(--color-caution-400)] md:ml-0">
          Prototype
        </span>
      </div>
    </header>
  );
}
