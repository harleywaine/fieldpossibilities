'use client';

/**
 * Screens within the screen. Everything the viewer operates sits inside one of
 * these two windows — the customer's browser, or Field's CRM — so it reads as
 * a mock-up of a system, not the system itself. The narration stays outside.
 */

function Chrome({ children, tag }: { children: React.ReactNode; tag: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50 px-3.5 py-2">
      <span className="flex shrink-0 gap-1.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
      </span>
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
      <span className="mono hidden shrink-0 text-[9.5px] tracking-[0.12em] text-ink-400 sm:inline">{tag}</span>
    </div>
  );
}

const WINDOW = 'overflow-hidden rounded-[6px] border border-ink-200 bg-white shadow-[0_30px_70px_-40px_rgba(3,70,148,0.45)]';

/* ---------------------------------------------------------------- customer */

export function BrowserFrame({ address, children }: { address: string; children: React.ReactNode }) {
  return (
    <div className={WINDOW}>
      <Chrome tag="MOCK-UP · CUSTOMER’S BROWSER">
        <span className="mono w-full max-w-md truncate rounded-full border border-ink-100 bg-white px-3 py-1 text-center text-[10.5px] text-ink-400">
          {address}
        </span>
      </Chrome>
      <div className="flex items-center gap-6 border-b border-ink-100 px-5 py-3 sm:px-8">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rotate-45 bg-signal-700" />
          <span className="text-[13px] font-semibold tracking-tight text-signal-800">Field</span>
        </span>
        <nav className="hidden gap-5 text-[11.5px] text-ink-500 sm:flex">
          <span>Products</span>
          <span>Services</span>
          <span className="text-signal-700 underline decoration-signal-300 underline-offset-[6px]">Find a part</span>
          <span>Contact</span>
        </nav>
      </div>
      <div className="min-h-[420px] px-5 py-7 sm:px-8">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- field */

export type CrmModule = 'Inbox' | 'Accounts' | 'Enquiries' | 'Engineering' | 'Procurement' | 'Quotes' | 'Orders';
const MODULES: CrmModule[] = ['Inbox', 'Accounts', 'Enquiries', 'Engineering', 'Procurement', 'Quotes', 'Orders'];

export function CrmFrame({
  module, crumbs, user, badges = {}, children,
}: {
  module: CrmModule;
  crumbs: string[];
  user: { name: string; role: string; you?: boolean };
  badges?: Partial<Record<CrmModule, number>>;
  children: React.ReactNode;
}) {
  const initials = user.name.split(' ').map((w) => w[0]).join('');
  return (
    <div className={WINDOW}>
      <Chrome tag="MOCK-UP · SYNTHETIC RECORDS">
        <span className="text-[11px] font-medium text-ink-500">Field CRM</span>
      </Chrome>
      <div className="flex min-h-[480px]">
        <aside className="hidden w-40 shrink-0 bg-signal-900 py-3 md:block">
          <p className="flex items-center gap-2 px-4 pb-4 pt-1">
            <span className="h-1.5 w-1.5 rotate-45 bg-signal-300" />
            <span className="text-[11.5px] font-semibold tracking-tight text-white">Field</span>
          </p>
          <ul>
            {MODULES.map((m) => (
              <li
                key={m}
                className={`flex items-center justify-between px-4 py-[7px] text-[11.5px] ${
                  m === module ? 'border-l-2 border-signal-300 bg-signal-800 pl-[14px] text-white' : 'text-signal-200/70'
                }`}
              >
                {m}
                {badges[m] ? (
                  <span className="mono rounded-full bg-action-600 px-1.5 text-[9.5px] leading-[15px] text-white">{badges[m]}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-2.5 sm:px-5">
            <p className="min-w-0 flex-1 truncate text-[11.5px] text-ink-400">
              <span className="md:hidden">{module} · </span>
              {crumbs.map((c, i) => (
                <span key={i} className={i === crumbs.length - 1 ? 'text-ink-800' : ''}>
                  {i > 0 && <span className="mx-1.5 text-ink-300">/</span>}
                  {c}
                </span>
              ))}
            </p>
            <span className="flex shrink-0 items-center gap-2">
              <span className="hidden text-right leading-tight sm:block">
                <span className="block text-[11px] text-ink-800">{user.name}{user.you && <span className="text-caution-600"> (you)</span>}</span>
                <span className="block text-[10px] text-ink-400">{user.role}</span>
              </span>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-medium ${user.you ? 'bg-caution-500 text-white' : 'bg-signal-100 text-signal-700'}`}>
                {initials}
              </span>
            </span>
          </div>
          <div className="flex-1 bg-ink-25 p-4 sm:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ shared parts */

/** The halt: shown above the window whenever a step is waiting on the viewer. */
export function YourDecision({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-[3px] border px-4 py-3 transition-colors ${
        done
          ? 'border-strong-600/30 bg-strong-600/[0.04]'
          : 'border-caution-500/40 bg-caution-500/[0.06]'
      }`}
    >
      <span className="relative mt-[5px] flex h-2 w-2 shrink-0">
        {!done && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caution-500 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${done ? 'bg-strong-600' : 'bg-caution-500'}`} />
      </span>
      <div>
        <p className={`mono text-[10.5px] tracking-[0.12em] ${done ? 'text-strong-600' : 'text-caution-600'}`}>
          {done ? 'DECIDED — THE PROCESS CAN CONTINUE' : 'YOUR DECISION — THE PROCESS HAS STOPPED'}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{children}</p>
      </div>
    </div>
  );
}

export function Choice({
  active, onClick, children, tone = 'neutral',
}: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'neutral' | 'go' | 'stop' }) {
  const on = {
    neutral: 'border-signal-600 bg-signal-600 text-white',
    go: 'border-strong-600 bg-strong-600 text-white',
    stop: 'border-action-600 bg-action-600 text-white',
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`rounded-[3px] border px-3 py-1.5 text-[11.5px] transition-colors ${
        active ? on : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400'
      }`}
    >
      {children}
    </button>
  );
}

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'grey';

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const cls = {
    blue: 'bg-signal-50 text-signal-700',
    green: 'bg-strong-600/10 text-strong-600',
    amber: 'bg-caution-500/12 text-caution-600',
    red: 'bg-action-600/10 text-action-600',
    grey: 'bg-ink-75 text-ink-500',
  }[tone];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-[1px] text-[10.5px] font-medium ${cls}`}>{children}</span>;
}

export function Panel({ title, aside, children, className = '' }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-[4px] border border-ink-100 bg-white ${className}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-ink-100 px-4 py-2.5">
        <h3 className="text-[11.5px] font-semibold text-ink-800">{title}</h3>
        {aside && <span className="text-[10.5px] text-ink-400">{aside}</span>}
      </header>
      {children}
    </section>
  );
}
