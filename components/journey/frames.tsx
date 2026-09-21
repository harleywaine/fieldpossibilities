'use client';

import {
  Bell, Building2, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Factory, FileText,
  Inbox, LayoutDashboard, Search, Settings, Truck, Wrench, Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar } from '@/components/journey/ui.tsx';

/**
 * Screens within the screen. Everything the viewer operates sits inside one of
 * these two windows — the customer's browser, or Field's CRM — so it reads as
 * a mock-up of a system, not the system itself. The narration stays outside.
 */

// On a phone the window runs edge to edge: every pixel of width goes to the app.
const WINDOW = '-mx-4 overflow-hidden border-y border-ink-200/80 bg-white shadow-[0_40px_80px_-40px_rgba(4,24,47,0.45),0_2px_6px_rgba(4,24,47,0.06)] sm:mx-0 sm:rounded-xl sm:border-x';

function Chrome({ children, tag }: { children: React.ReactNode; tag: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-100 bg-[#f3f5f8] px-3.5 py-2">
      <span className="flex shrink-0 gap-1.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
      </span>
      <div className="flex min-w-0 flex-1 justify-center">{children}</div>
      <span className="mono shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] tracking-[0.12em] text-ink-400 ring-1 ring-ink-100">
        <span className="sm:hidden">MOCK-UP</span>
        <span className="hidden sm:inline">{tag}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- customer */

export function BrowserFrame({ path, basket, children }: { path: string; basket: number; children: React.ReactNode }) {
  return (
    <div className={WINDOW}>
      <Chrome tag="MOCK-UP · CUSTOMER’S BROWSER">
        <span className="flex w-full max-w-md items-center gap-2 rounded-md bg-white px-3 py-1 text-[11px] text-ink-400 ring-1 ring-ink-100">
          <span className="text-[8px] text-strong-600">●</span>
          <span className="truncate">field-international · {path}</span>
        </span>
      </Chrome>
      <div className="hidden bg-signal-900 px-5 py-1.5 text-[10.5px] text-signal-200/80 sm:block sm:px-8">
        Aerospace tooling and ground support equipment · worldwide supply
      </div>
      <header className="flex items-center gap-8 border-b border-ink-100 bg-white px-4 py-3 sm:px-8 sm:py-3.5">
        <span className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-signal-700">
            <span className="h-2.5 w-2.5 rotate-45 bg-white" />
          </span>
          <span className="leading-none">
            <span className="block text-[14px] font-semibold tracking-tight text-signal-900">Field</span>
            <span className="block text-[8.5px] tracking-[0.18em] text-ink-400">INTERNATIONAL</span>
          </span>
        </span>
        <nav className="hidden gap-6 text-[12px] font-medium text-ink-600 md:flex">
          <span>Products</span>
          <span>Industries</span>
          <span>Services</span>
          <span className="text-signal-700">Find a part</span>
          <span>About</span>
        </nav>
        <span className="ml-auto flex items-center gap-3">
          <Search className="hidden h-4 w-4 text-ink-400 sm:block" />
          <span className="flex items-center gap-2 rounded-md bg-signal-50 px-2.5 py-1.5 text-[11.5px] font-medium text-signal-700">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quote basket</span>
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-signal-700 px-1 text-[10px] text-white">{basket}</span>
          </span>
        </span>
      </header>
      <div className="min-h-[440px] bg-white">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- field */

export type CrmModule = 'Home' | 'Enquiries' | 'Accounts' | 'Quotes' | 'Engineering' | 'Procurement' | 'Orders';

const NAV: Array<{ group: string; items: Array<{ id: CrmModule; icon: LucideIcon }> }> = [
  { group: 'Sales', items: [
    { id: 'Home', icon: LayoutDashboard },
    { id: 'Enquiries', icon: Inbox },
    { id: 'Accounts', icon: Building2 },
    { id: 'Quotes', icon: FileText },
  ] },
  { group: 'Operations', items: [
    { id: 'Engineering', icon: Wrench },
    { id: 'Procurement', icon: Truck },
    { id: 'Orders', icon: Factory },
  ] },
];

export function CrmFrame({
  module, user, badges = {}, children,
}: {
  module: CrmModule;
  user: { name: string; role: string; you?: boolean };
  badges?: Partial<Record<CrmModule, number>>;
  children: React.ReactNode;
}) {
  return (
    <div className={WINDOW}>
      <Chrome tag="MOCK-UP · SYNTHETIC RECORDS">
        <span className="text-[11px] font-medium text-ink-500">Field CRM — {module}</span>
      </Chrome>
      <div className="flex min-h-[560px]">
        {/* ------------------------------------------------------ sidebar */}
        <aside className="hidden w-[200px] shrink-0 flex-col bg-[#0a1a2f] lg:flex">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-signal-500">
              <span className="h-2 w-2 rotate-45 bg-white" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12px] font-semibold text-white">Field International</span>
              <span className="block text-[10px] text-signal-200/50">CRM</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-signal-200/40" />
          </div>
          <nav className="flex-1 space-y-4 px-2.5 py-3.5">
            {NAV.map((g) => (
              <div key={g.group}>
                <p className="mb-1 px-2 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-signal-200/35">{g.group}</p>
                <ul className="space-y-0.5">
                  {g.items.map(({ id, icon: Icon }) => {
                    const on = id === module;
                    return (
                      <li
                        key={id}
                        className={`flex items-center gap-2.5 rounded-md px-2 py-[6px] text-[12px] ${
                          on ? 'bg-white/[0.09] font-medium text-white' : 'text-signal-100/55'
                        }`}
                      >
                        <Icon className={`h-[15px] w-[15px] ${on ? 'text-signal-300' : ''}`} strokeWidth={1.8} />
                        <span className="flex-1">{id}</span>
                        {badges[id] ? (
                          <span className="rounded-full bg-action-500 px-1.5 text-[10px] font-semibold leading-4 text-white">{badges[id]}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-white/[0.06] px-2.5 py-3">
            <p className="flex items-center gap-2.5 rounded-md px-2 py-[6px] text-[12px] text-signal-100/55">
              <Settings className="h-[15px] w-[15px]" strokeWidth={1.8} /> Settings
            </p>
          </div>
        </aside>

        {/* --------------------------------------------------------- main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center gap-3 border-b border-ink-100 bg-white px-3 sm:px-4">
            <Menu className="h-4 w-4 shrink-0 text-ink-400 lg:hidden" />
            <span className="flex h-8 min-w-0 max-w-sm flex-1 items-center gap-2 rounded-md bg-ink-50 px-2.5 text-[12px] text-ink-400 ring-1 ring-inset ring-ink-100">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search accounts, enquiries, parts…</span>
              <kbd className="mono ml-auto hidden rounded bg-white px-1 text-[10px] text-ink-400 ring-1 ring-ink-200 sm:inline">⌘K</kbd>
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-3.5 text-ink-400">
              <CircleHelp className="hidden h-4 w-4 sm:block" />
              <span className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-action-500" />
              </span>
              <span className="h-5 w-px bg-ink-100" />
              <span className="flex items-center gap-2">
                <Avatar name={user.name} size={28} you={user.you} />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-[11.5px] font-medium text-ink-900">
                    {user.name}
                    {user.you && <span className="ml-1.5 rounded bg-caution-500/15 px-1 text-[9.5px] font-semibold text-caution-600">YOU</span>}
                  </span>
                  <span className="block text-[10.5px] text-ink-400">{user.role}</span>
                </span>
              </span>
            </span>
          </div>
          <div className="flex-1 bg-[#f6f8fb] p-3 sm:p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Breadcrumb, record title, key facts and actions — the top of every CRM page. */
export function PageHeader({
  crumbs, icon: Icon, logo, title, badges, meta, actions,
}: {
  crumbs: string[];
  icon?: LucideIcon;
  logo?: React.ReactNode;
  title: React.ReactNode;
  badges?: React.ReactNode;
  meta?: React.ReactNode[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="mb-3 flex flex-wrap items-center gap-1 text-[11.5px] text-ink-400">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-ink-300" />}
            <span className={i === crumbs.length - 1 ? 'text-ink-600' : ''}>{c}</span>
          </span>
        ))}
      </p>
      <div className="flex flex-wrap items-start gap-3.5">
        {logo ?? (Icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-signal-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-ink-100 sm:h-10 sm:w-10">
            <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.8} />
          </span>
        ))}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-tight text-ink-950 sm:text-[18px]">{title}</h2>
            {badges}
          </div>
          {meta && (
            <p className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-ink-500">
              {meta.map((m, i) => (
                <span key={i} className="flex items-center gap-1.5">{m}</span>
              ))}
            </p>
          )}
        </div>
        {actions && <div className="flex w-full flex-wrap gap-2 empty:hidden sm:w-auto [&>button]:max-sm:flex-1">{actions}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ shared parts */

/** The halt: shown above the window whenever a step is waiting on the viewer. */
export function YourDecision({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
        done ? 'border-strong-600/25 bg-strong-600/[0.04]' : 'border-caution-500/35 bg-caution-500/[0.06]'
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
