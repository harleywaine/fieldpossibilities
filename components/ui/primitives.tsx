import Link from 'next/link';
import type { MatchClass } from '@/lib/catalogue/types.ts';

export function MatchBadge({ cls }: { cls: MatchClass }) {
  const map: Record<MatchClass, { label: string; className: string }> = {
    strong: {
      label: 'Strong match',
      className: 'bg-[color:var(--color-strong-600)]/12 text-[color:var(--color-strong-600)] ring-[color:var(--color-strong-600)]/25 [color:var(--color-strong-400)]',
    },
    potential: {
      label: 'Potential match',
      className: 'bg-[color:var(--color-signal-600)]/12 text-[color:var(--color-signal-600)] ring-[color:var(--color-signal-600)]/25 [color:var(--color-signal-400)]',
    },
    alternative: {
      label: 'Alternative',
      className: 'bg-[color:var(--color-caution-600)]/12 text-[color:var(--color-caution-600)] ring-[color:var(--color-caution-600)]/25 [color:var(--color-caution-400)]',
    },
    none: {
      label: 'No confirmed match',
      className: 'bg-ink-400/12 text-ink-500 ring-ink-400/25',
    },
  };
  const m = map[cls];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${m.className}`}>
      {m.label}
    </span>
  );
}

export function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'muted' | 'caution' }) {
  const tones = {
    default: 'bg-ink-50 text-ink-700 ring-ink-200',
    muted: 'bg-transparent text-ink-400 ring-ink-200',
    caution: 'bg-[color:var(--color-caution-600)]/10 text-[color:var(--color-caution-600)] ring-[color:var(--color-caution-600)]/25 [color:var(--color-caution-400)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Renders a value, or an explicit "not published" marker — never a blank. */
export function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className={`text-sm ${empty ? 'text-ink-400 italic' : 'text-ink-800 '} ${mono && !empty ? 'mono' : ''}`}>
        {empty ? 'Not published in catalogue' : value}
      </dd>
    </div>
  );
}

export function SourceNote({ url, className = '' }: { url: string; className?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center gap-1.5 text-xs text-ink-500 underline decoration-ink-300 underline-offset-2 transition hover:text-signal-600 ${className}`}
    >
      Source: Field International catalogue
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <path d="M4.5 2.5h5v5M9.5 2.5 4 8M8 9.5H2.5V4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

export function Button({
  children, href, onClick, variant = 'primary', type = 'button', disabled = false, className = '',
}: {
  children: React.ReactNode; href?: string; onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean; className?: string;
}) {
  // Field uses red for calls to action and blue for navigation; mirrored here.
  const styles = {
    primary: 'bg-action-600 text-white hover:bg-action-500',
    secondary: 'bg-white text-signal-600 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-signal-300',
    ghost: 'text-ink-600 hover:bg-ink-100',
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-[3px] px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-500">{children}</h2>
      {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
    </div>
  );
}

/** Distinguishes source-derived content from AI interpretation (brief §29). */
export function AIBadge({ provider }: { provider?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-signal-600/10 px-2 py-0.5 text-[11px] font-semibold text-signal-600 ring-1 ring-inset ring-signal-600/20">
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <path d="M6 1v10M1 6h10M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      AI interpretation{provider ? ` · ${provider}` : ''}
    </span>
  );
}
