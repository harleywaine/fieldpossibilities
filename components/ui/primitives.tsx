import Link from 'next/link';
import type { MatchClass } from '@/lib/catalogue/types.ts';

export function MatchBadge({ cls }: { cls: MatchClass }) {
  // A coloured status dot beside a small caps label reads as an instrument
  // readout rather than a pill, and stays legible at this size.
  const map: Record<MatchClass, { label: string; border: string; text: string; dot: string }> = {
    strong: {
      label: 'STRONG MATCH',
      border: 'border-[color:var(--color-strong-600)]/30',
      text: 'text-[color:var(--color-strong-600)]',
      dot: 'bg-[color:var(--color-strong-600)]',
    },
    potential: {
      label: 'POTENTIAL MATCH',
      border: 'border-signal-600/30',
      text: 'text-signal-600',
      dot: 'bg-signal-500',
    },
    alternative: {
      label: 'ALTERNATIVE',
      border: 'border-[color:var(--color-caution-600)]/30',
      text: 'text-[color:var(--color-caution-600)]',
      dot: 'bg-[color:var(--color-caution-600)]',
    },
    none: {
      label: 'NO CONFIRMED MATCH',
      border: 'border-ink-200',
      text: 'text-ink-400',
      dot: 'bg-ink-300',
    },
  };
  const m = map[cls];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[2px] border bg-white px-2 py-[3px] text-[10px] font-semibold tracking-[0.06em] ${m.border} ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'muted' | 'caution' }) {
  const tones = {
    default: 'bg-ink-50 text-ink-700 ring-ink-200',
    muted: 'bg-transparent text-ink-400 ring-ink-200',
    caution: 'bg-[color:var(--color-caution-600)]/10 text-[color:var(--color-caution-600)] ring-[color:var(--color-caution-600)]/25',
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
      <dt className="label">{label}</dt>
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
      className={`inline-flex items-center gap-1.5 text-[11.5px] text-ink-400 underline decoration-ink-200 decoration-dotted underline-offset-[3px] transition-colors hover:text-signal-600 hover:decoration-signal-300 ${className}`}
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
    secondary: 'border border-ink-200 bg-white text-signal-600 hover:border-signal-300 hover:bg-signal-50',
    ghost: 'text-ink-600 hover:bg-ink-100',
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-[2px] px-4 py-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles[variant]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="label">{children}</h2>
      {sub && <p className="mt-1.5 text-[13px] text-ink-500">{sub}</p>}
    </div>
  );
}

/** Distinguishes source-derived content from AI interpretation (brief §29). */
export function AIBadge({ provider }: { provider?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-signal-600/25 bg-signal-50 px-2 py-[3px] text-[10px] font-semibold tracking-[0.06em] text-signal-600">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden="true">
        <path d="M6 1.2v9.6M1.2 6h9.6M2.8 2.8l6.4 6.4M9.2 2.8l-6.4 6.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      AI INTERPRETATION{provider ? ` · ${provider}` : ''}
    </span>
  );
}
