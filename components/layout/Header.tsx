import Link from 'next/link';

const NAV = [
  { href: '/', label: 'The journey' },
  { href: '/demos', label: 'Demos' },
  { href: '/explore', label: 'Explore' },
  { href: '/roi', label: 'ROI' },
  { href: '/architecture', label: 'Architecture' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/92 backdrop-blur-sm">
      <div className="mx-auto flex h-15 max-w-7xl items-center gap-6 px-5 py-3 sm:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <Mark />
          <span className="flex flex-col leading-none">
            <span className="text-[14px] font-medium tracking-tight text-ink-900">
              Field AI Opportunity Lab
            </span>
            <span className="mt-1 text-[10px] tracking-[0.1em] text-ink-400">
              FIELD INTERNATIONAL
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-[2px] px-2.5 py-1.5 text-[13px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-signal-600"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-[2px] border border-ink-200 px-2 py-1 lg:ml-4">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-caution-500)]" />
          <span className="text-[10px] font-semibold tracking-[0.09em] text-ink-500">DEMO MODE</span>
        </span>
      </div>
    </header>
  );
}

/** Geometric mark: an aperture, drawn rather than illustrated. */
function Mark() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[2px] bg-signal-700">
      <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 text-white" aria-hidden="true">
        <path d="M10 2.2 17.2 10 10 17.8 2.8 10z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".55" />
        <path d="M10 5.6 14.2 10 10 14.4 5.8 10z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="1.35" fill="currentColor" />
      </svg>
    </span>
  );
}
