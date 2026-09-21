'use client';

import { useState } from 'react';
import { Check, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/*
 * The building blocks of the two mock applications. They're styled as a
 * product would be, but anything that isn't part of the demo (a "Log call"
 * button, the search box) is inert: it looks real and does nothing.
 */

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'grey' | 'violet';

const TONE: Record<Tone, string> = {
  blue: 'bg-signal-50 text-signal-700 ring-signal-600/15',
  green: 'bg-strong-600/[0.07] text-strong-600 ring-strong-600/20',
  amber: 'bg-caution-500/[0.09] text-caution-600 ring-caution-500/25',
  red: 'bg-action-600/[0.06] text-action-600 ring-action-600/20',
  grey: 'bg-ink-50 text-ink-600 ring-ink-200',
  violet: 'bg-[#f3f0ff] text-[#5b3fc4] ring-[#5b3fc4]/15',
};
const DOT: Record<Tone, string> = {
  blue: 'bg-signal-500', green: 'bg-strong-500', amber: 'bg-caution-500',
  red: 'bg-action-500', grey: 'bg-ink-300', violet: 'bg-[#6d4fe0]',
};

export function Badge({ tone = 'grey', dot, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}

const AVATAR = [
  'bg-[#e0ecff] text-[#1d4ed8]', 'bg-[#dcfce7] text-[#15803d]', 'bg-[#fef3c7] text-[#b45309]',
  'bg-[#fce7f3] text-[#be185d]', 'bg-[#ede9fe] text-[#6d28d9]', 'bg-[#e0f2fe] text-[#0369a1]',
];

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

export function Avatar({ name, size = 24, square, you }: { name: string; size?: number; square?: boolean; you?: boolean }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cls = you ? 'bg-caution-500 text-white' : AVATAR[h % AVATAR.length];
  return (
    <span
      className={`inline-grid shrink-0 place-items-center font-semibold ${square ? 'rounded-lg' : 'rounded-full'} ${cls}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}

export function Button({
  children, icon: Icon, variant = 'secondary', size = 'sm', onClick, disabled,
}: {
  children?: React.ReactNode; icon?: LucideIcon; variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
  size?: 'xs' | 'sm' | 'md'; onClick?: () => void; disabled?: boolean;
}) {
  const v = {
    primary: 'bg-signal-600 text-white shadow-sm hover:bg-signal-500',
    success: 'bg-strong-600 text-white shadow-sm hover:bg-strong-500',
    danger: 'bg-action-600 text-white shadow-sm hover:bg-action-500',
    secondary: 'bg-white text-ink-700 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-ink-200 hover:bg-ink-25',
    ghost: 'text-ink-600 hover:bg-ink-50',
  }[variant];
  const s = { xs: 'h-6 px-2 text-[11px] gap-1', sm: 'h-7 px-2.5 text-[12px] gap-1.5', md: 'h-9 px-3.5 text-[13px] gap-2' }[size];
  const cls = `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${v} ${s}`;
  const content = <>{Icon && <Icon className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2} />}{children}</>;
  // No handler: a control the mock-up shows but the demo doesn't use.
  if (!onClick) return <span className={`${cls} cursor-default max-sm:hidden`}>{content}</span>;
  return <button onClick={onClick} disabled={disabled} className={cls}>{content}</button>;
}

export function Card({ title, icon: Icon, action, children, className = '', pad = true }: {
  title?: React.ReactNode; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean;
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-lg border border-ink-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-2.5">
          <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
            {Icon && <Icon className="h-3.5 w-3.5 text-ink-400" strokeWidth={2} />}
            {title}
          </h3>
          {action && <div className="text-[11.5px] text-ink-400">{action}</div>}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function Fields({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="space-y-2.5">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-2">
          <dt className="text-[11.5px] text-ink-400">{k}</dt>
          <dd className="min-w-0 text-[12.5px] text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="min-w-0 rounded-lg border border-ink-100 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <p className="text-[11px] font-medium leading-tight text-ink-500 sm:truncate">{label}</p>
      <p className="mt-1 text-[18px] font-semibold tracking-tight text-ink-950 sm:text-[20px]">{value}</p>
      {sub && <p className={`mt-0.5 text-[11px] leading-tight sm:truncate ${tone === 'good' ? 'text-strong-600' : tone === 'bad' ? 'text-action-600' : 'text-ink-400'}`}>{sub}</p>}
    </div>
  );
}

/** Salesforce-style path: where a record is in its process. */
export function StagePath({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol className="flex w-full overflow-hidden rounded-md text-[11.5px] font-medium">
      {stages.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const first = i === 0;
        const last = i === stages.length - 1;
        return (
          <li
            key={s}
            className={`relative flex h-8 min-w-0 items-center justify-center gap-1.5 px-3 ${now ? 'flex-[3] sm:flex-1' : 'flex-1'} ${
              done ? 'bg-signal-600/90 text-white' : now ? 'bg-signal-800 text-white' : 'bg-ink-75 text-ink-500'
            }`}
            style={{
              clipPath: `polygon(${first ? '0 0' : '0 0'}, calc(100% - ${last ? 0 : 8}px) 0, 100% 50%, calc(100% - ${last ? 0 : 8}px) 100%, 0 100%, ${first ? '0 50%' : '8px 50%'})`,
              marginLeft: first ? 0 : -6,
            }}
          >
            {done && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
            <span className={now ? 'truncate' : 'hidden truncate sm:inline'}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Tabs({ tabs, active }: { tabs: Array<{ label: string; count?: number }>; active: string }) {
  return (
    <div className="flex gap-4 overflow-x-auto border-b sm:gap-5 border-ink-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => (
        <span
          key={t.label}
          className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2 text-[12.5px] font-medium ${
            t.label === active ? 'border-signal-600 text-ink-950' : 'border-transparent text-ink-400'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={`rounded-full px-1.5 text-[10.5px] ${t.label === active ? 'bg-signal-50 text-signal-700' : 'bg-ink-50 text-ink-500'}`}>{t.count}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** A catalogue photo, or a neutral tile when Field publishes none. */
export function Thumb({ src, size = 36, alt = '' }: { src: string | null; size?: number; alt?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid shrink-0 place-items-center overflow-hidden rounded-md border border-ink-100 bg-white" style={{ width: size, height: size }}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain p-0.5" />
      ) : (
        <Package className="text-ink-300" style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={1.5} />
      )}
    </span>
  );
}

export function Th({ children, right, className = '' }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <th className={`whitespace-nowrap bg-ink-25 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-ink-500 first:pl-4 last:pr-4 ${right ? 'text-right' : 'text-left'} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, right, className = '' }: { children?: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-3 py-2.5 text-[12.5px] first:pl-4 last:pr-4 ${right ? 'text-right' : ''} ${className}`}>{children}</td>;
}
