'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  STEPS, PERSONAS, stepIndex, formatMinutes, simulatedLeadDays, matchAccount,
  type StepId, type StepMetric,
} from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import type { CrmAccount, CrmInboxItem } from '@/lib/simulation/crm.ts';
import { BrowserFrame, CrmFrame, YourDecision, type CrmModule } from '@/components/journey/frames.tsx';
import { RequestScreen, PartsScreen, type QuoteForm } from '@/components/journey/customer-stages.tsx';
import {
  InboxScreen, AccountScreen, CheckScreen, ReviewScreen, SupplierScreen, ApprovalScreen, OrderScreen,
  type Decision, type Contact,
} from '@/components/journey/crm-stages.tsx';

interface SimState {
  request: string;
  found: SimRfq | null;
  excluded: number[];
  form: QuoteForm;
  contact: (Contact & { accountId: string | null }) | null;
  rfq: SimRfq | null;
  brief: any | null;
  review: Record<number, Decision>;
  supplierSent: boolean;
  approval: 'approved' | 'returned' | null;
  risk: string | null;
}

const STORE = 'field-simulation-v2';
const EMPTY: SimState = {
  request: '', found: null, excluded: [], form: { email: '', company: '' }, contact: null,
  rfq: null, brief: null, review: {}, supplierSent: false, approval: null, risk: null,
};
const DOWNSTREAM: Partial<SimState> = {
  contact: null, rfq: null, brief: null, review: {}, supplierSent: false, approval: null, risk: null,
};

/** Who takes an enquiry from a company Field has no account for. Synthetic. */
const NEW_LEADS = { name: 'Tom Whitfield', role: 'Sales Engineer' };

/**
 * The viewer's own enquiry: first as Field's customer on a mock of the website,
 * then through a mock of Field's CRM. Human steps halt until the viewer
 * decides, and the rail won't let them skip past one. State survives reloads
 * (this tab only), and every step has its own URL.
 */
export function Journey({
  metrics, accounts, inbox,
}: { metrics: Record<string, StepMetric>; accounts: CrmAccount[]; inbox: CrmInboxItem[] }) {
  const params = useSearchParams();
  const [sim, setSim] = useState<SimState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ------------------------------------------------------------ persistence
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) setSim({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* storage unavailable — start fresh */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { sessionStorage.setItem(STORE, JSON.stringify(sim)); } catch { /* ignore */ }
  }, [sim, loaded]);

  const patch = (p: Partial<SimState>) => setSim((s) => ({ ...s, ...p }));

  // --------------------------------------------------------------- derived
  const { found, rfq, contact } = sim;
  const account = accounts.find((a) => a.id === contact?.accountId) ?? null;
  const customerName = account?.name ?? contact?.company ?? '';
  const owner = account?.owner ?? NEW_LEADS;

  const reviewLines = rfq?.lines.filter((l) => l.flags.some((f) => f.kind === 'review')) ?? [];
  const reviewDone = reviewLines.every((l) => sim.review[l.line]);
  const included = rfq?.lines.filter((l) => !sim.review[l.line] || sim.review[l.line] === 'approve') ?? [];
  const held = rfq?.lines.filter((l) => sim.review[l.line] && sim.review[l.line] !== 'approve') ?? [];
  const supplierLines = included.filter((l) => l.flags.some((f) => f.kind === 'supplier'));
  const supplierDone = supplierLines.length === 0 || sim.supplierSent;

  const leadDays = useCallback((l: SimLine) => {
    const needsSupplier = l.flags.some((f) => f.kind === 'supplier');
    return needsSupplier ? simulatedLeadDays(l.partNumber, l.leadTimeDays) : (l.leadTimeDays ?? 0);
  }, []);
  const replies = Object.fromEntries(supplierLines.map((l) => [l.line, simulatedLeadDays(l.partNumber, l.leadTimeDays)]));
  const deliveryDays = included.length ? Math.max(...included.map(leadDays)) : null;
  const lateCount = included.filter((l) => rfq?.deadlineDays != null && leadDays(l) > rfq.deadlineDays).length;
  const riskDone = lateCount === 0 || Boolean(sim.risk);

  /** The furthest step the viewer may reach — they can't jump past a decision. */
  const reachable = useMemo(() => {
    if (!found) return stepIndex('request');
    if (!contact || !rfq) return stepIndex('parts');
    if (!reviewDone) return stepIndex('review');
    if (!supplierDone) return stepIndex('supplier');
    if (sim.approval !== 'approved') return stepIndex('approval');
    if (!riskDone) return stepIndex('manufacture');
    return STEPS.length - 1;
  }, [found, contact, rfq, reviewDone, supplierDone, sim.approval, riskDone]);

  const raw = Number(params.get('s') ?? 0);
  const requested = Number.isFinite(raw) ? Math.max(0, Math.min(STEPS.length - 1, Math.floor(raw))) : 0;
  const index = loaded ? Math.min(requested, reachable) : Math.min(requested, 1);
  const step = STEPS[index];

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(reachable, i));
    if (next === index) return;
    window.history.pushState(null, '', next === 0 ? '?' : `?s=${next}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [reachable, index]);

  // A deep link beyond what's been decided lands on the step that's waiting.
  useEffect(() => {
    if (loaded && requested > reachable) {
      window.history.replaceState(null, '', reachable === 0 ? '?' : `?s=${reachable}`);
    }
  }, [loaded, requested, reachable]);

  // ---------------------------------------------------------------- actions
  const find = async () => {
    const q = sim.request.trim();
    if (q.length < 3 || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/simulate/rfq', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data: SimRfq & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'The search failed.');
      if (!data.lines.length) throw new Error('Nothing in the catalogue matched that. Try naming the aircraft or the job.');
      setSim((s) => ({ ...s, ...DOWNSTREAM, found: data, excluded: [] }));
      window.history.pushState(null, '', `?s=${stepIndex('parts')}`);
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The search failed.');
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    if (!found) return;
    const matched = matchAccount(sim.form.company, accounts);
    const lines = found.lines
      .filter((l) => !sim.excluded.includes(l.line))
      .map((l, i) => ({ ...l, line: i + 1 }));
    setSim((s) => ({
      ...s, ...DOWNSTREAM,
      rfq: { ...found, lines },
      contact: { email: s.form.email.trim(), company: s.form.company.trim(), accountId: matched?.id ?? null },
    }));
    // The account research runs in the background, so it's ready when reached.
    if (matched) {
      const about = [found.aircraft, found.engine, 'tooling'].filter(Boolean).join(' ');
      fetch('/api/knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `I've received an enquiry from ${matched.name} for ${about}. Tell me everything I need to know before I respond.` }),
      }).then((r) => r.json()).then((d) => patch({ brief: d.brief ?? null })).catch(() => {});
    }
  };

  const restart = () => {
    setSim((s) => ({ ...EMPTY, form: s.form }));
    go(0);
  };

  // ---------------------------------------------------------------- ledger
  const ledger = useMemo(() => {
    const rows = STEPS.map((s, i) => ({ s, i, m: s.metric ? metrics[s.metric] : undefined }))
      .filter((r): r is { s: (typeof STEPS)[number]; i: number; m: StepMetric } => Boolean(r.m));
    const totalBefore = rows.reduce((a, r) => a + r.m.before, 0);
    const totalAfter = rows.reduce((a, r) => a + r.m.after, 0);
    const done = rows.filter((r) => r.i <= index);
    return {
      totalBefore, totalAfter,
      before: done.reduce((a, r) => a + r.m.before, 0),
      after: done.reduce((a, r) => a + r.m.after, 0),
      latest: done[done.length - 1] ?? null,
    };
  }, [metrics, index]);

  // -------------------------------------------------------------- screens
  const decisions = Object.keys(sim.review).length + (sim.supplierSent ? 1 : 0)
    + (sim.approval === 'approved' ? 1 : 0) + (sim.risk ? 1 : 0);
  const pendingReview = reviewLines.filter((l) => !sim.review[l.line]).length;
  const you = (id: StepId) => ({ ...PERSONAS[id]!, you: true });
  const crm = (module: CrmModule, crumbs: string[], user: { name: string; role: string; you?: boolean }, body: React.ReactNode) => (
    <CrmFrame module={module} crumbs={crumbs} user={user} badges={{ Inbox: step.id === 'inbox' ? inbox.length + 1 : undefined }}>
      {body}
    </CrmFrame>
  );

  type Screen = {
    lines: React.ReactNode[];
    halt?: { done: boolean; text: React.ReactNode };
    frame?: React.ReactNode;
    body?: React.ReactNode;
    blocked?: string;
    cta?: string;
    hideContinue?: boolean;
  };

  const screens: Record<StepId, Screen> = {
    start: {
      lines: [
        'Play Field’s customer. Then play Field.',
        'Ask for tooling the way a customer would, then follow the enquiry through Field’s systems, making the decisions a person would make.',
      ],
      body: (
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-400">
          Each screen shows a mock-up: the customer’s browser, then Field’s CRM. The catalogue is Field’s real,
          published one. Customers, their history, employees, suppliers and replies are synthetic, and labelled
          as such. Steps with a ring on the rail above stop and wait for your decision.
        </p>
      ),
      cta: 'Begin',
    },
    request: {
      lines: ['You are the customer.', 'Say what you need, the way you would to a supplier.'],
      frame: (
        <BrowserFrame address="field — find a part">
          <RequestScreen value={sim.request} onChange={(v) => patch({ request: v })} onSubmit={find} busy={busy} error={error} />
        </BrowserFrame>
      ),
      cta: 'Continue with these parts',
      hideContinue: !found,
    },
    parts: {
      lines: contact
        ? ['Your request is on its way to Field.']
        : ['These are the parts you’ll need.', 'Each one comes from Field’s real catalogue, with the reason it was picked.'],
      frame: found && (
        <BrowserFrame address="field — find a part — results">
          <PartsScreen
            found={found}
            excluded={sim.excluded}
            onToggle={(line) => setSim((s) => ({
              ...s, excluded: s.excluded.includes(line) ? s.excluded.filter((x) => x !== line) : [...s.excluded, line],
            }))}
            form={sim.form}
            onForm={(form) => patch({ form })}
            sent={contact && rfq ? { email: contact.email, company: contact.company, reference: rfq.reference } : null}
            onSend={send}
            accountNames={accounts.map((a) => a.name)}
          />
        </BrowserFrame>
      ),
      cta: 'See it arrive at Field',
      hideContinue: !contact,
    },
    inbox: {
      lines: ['Now you’re at Field. The enquiry arrives.', 'Before anyone opens it, the system has logged it, found the account and assigned an owner.'],
      frame: rfq && contact && crm('Inbox', ['Inbox', rfq.reference], owner,
        <InboxScreen rfq={rfq} contact={contact} account={account} inbox={inbox} newLeadOwner={NEW_LEADS.name} />),
    },
    account: {
      lines: [
        account ? `${owner.name} opens the account.` : `${owner.name} opens the new lead.`,
        account ? `Everything Field holds on ${account.name}, on one screen.` : `${customerName} is new to Field.`,
      ],
      frame: rfq && contact && crm('Accounts', ['Accounts', customerName], owner,
        <AccountScreen account={account} contact={contact} rfq={rfq} brief={sim.brief} />),
    },
    check: {
      lines: ['Every line is checked against the catalogue.', 'Anything the catalogue doesn’t establish goes to a person.'],
      frame: rfq && crm('Enquiries', ['Enquiries', rfq.reference, 'Lines'], owner,
        <CheckScreen rfq={rfq} customer={customerName} owner={owner.name} />),
    },
    review: {
      lines: [reviewLines.length ? 'Engineering has lines to decide.' : 'Nothing needs Engineering this time.', `You are ${PERSONAS.review!.name}, ${PERSONAS.review!.role}.`],
      halt: reviewLines.length ? {
        done: reviewDone,
        text: reviewDone
          ? 'Every line in the queue has a decision.'
          : `${pendingReview} ${pendingReview === 1 ? 'line is' : 'lines are'} waiting in your queue. The system has given its reasons; it won’t decide for you.`,
      } : undefined,
      frame: rfq && crm('Engineering', ['Engineering', 'Review queue', rfq.reference], you('review'),
        <ReviewScreen rfq={rfq} lines={reviewLines} decisions={sim.review} onDecide={(line, d) => setSim((s) => ({ ...s, review: { ...s.review, [line]: d } }))} />),
      blocked: reviewDone ? undefined : 'Decide every line in the queue to continue',
    },
    supplier: {
      lines: [supplierLines.length ? 'Some lead times need confirming.' : 'Every lead time is already known.', `You are ${PERSONAS.supplier!.name}, ${PERSONAS.supplier!.role}.`],
      halt: supplierLines.length ? {
        done: sim.supplierSent,
        text: sim.supplierSent
          ? 'Enquiries sent. The replies are simulated.'
          : 'The system has drafted the supplier enquiries. Nothing is sent until you approve it.',
      } : undefined,
      frame: rfq && crm('Procurement', ['Procurement', 'Lead-time enquiries', rfq.reference], you('supplier'),
        <SupplierScreen lines={supplierLines} sent={sim.supplierSent} onSend={() => patch({ supplierSent: true })} replies={replies} deadlineDays={rfq.deadlineDays} />),
      blocked: supplierDone ? undefined : 'Approve the supplier enquiries to continue',
    },
    approval: {
      lines: ['The quote needs signing off.', `You are ${PERSONAS.approval!.name}, ${PERSONAS.approval!.role}.`],
      halt: {
        done: sim.approval === 'approved',
        text: sim.approval === 'approved'
          ? 'Signed off. In this mock-up nothing is actually sent.'
          : 'The quote is assembled. It goes nowhere until you sign it off.',
      },
      frame: rfq && contact && crm('Quotes', ['Quotes', rfq.reference.replace('RFQ', 'QT')], you('approval'),
        <ApprovalScreen
          rfq={rfq} customer={customerName} contact={contact} included={included} held={held}
          leadDays={leadDays} deliveryDays={deliveryDays} decision={sim.approval}
          onDecide={(d) => {
            patch({ approval: d });
            if (d === 'returned') go(stepIndex('review'));
          }}
        />),
      blocked: sim.approval === 'approved' ? undefined : 'Sign off the quote to continue',
    },
    manufacture: {
      lines: ['The customer accepts. The order goes into production.', `You are ${PERSONAS.manufacture!.name}, ${PERSONAS.manufacture!.role}.`],
      halt: lateCount ? {
        done: Boolean(sim.risk),
        text: sim.risk
          ? `Decided: ${sim.risk.toLowerCase()}.`
          : `${lateCount} ${lateCount === 1 ? 'item' : 'items'} will arrive after the customer’s deadline. The system has spotted it; the call is yours.`,
      } : undefined,
      frame: rfq && crm('Orders', ['Orders', rfq.reference.replace('RFQ', 'SO')], you('manufacture'),
        <OrderScreen rfq={rfq} included={included} leadDays={leadDays} decision={sim.risk} onDecide={(d) => patch({ risk: d })} />),
      blocked: riskDone ? undefined : 'Decide how to handle the late items to continue',
    },
    summary: {
      lines: ['One enquiry, start to finish.'],
      body: (
        <Summary
          before={ledger.totalBefore}
          after={ledger.totalAfter}
          volume={metrics['RFQ preparation']?.volume ?? 1900}
          decisions={decisions}
          rfq={rfq}
          brief={sim.brief}
          onRestart={restart}
        />
      ),
    },
  };

  const c = screens[step.id];
  const isLast = index === STEPS.length - 1;
  const delay = (n: number) => ({ animationDelay: `${n}ms` });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* --------------------------------------------------------------- top */}
      <header className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 pt-6 sm:px-8">
        <button onClick={() => go(0)} className="flex items-center gap-2" aria-label="Back to the start">
          <span className="h-2 w-2 rotate-45 bg-signal-700" />
          <span className="text-[12px] font-medium tracking-tight text-ink-800">Field</span>
        </button>
        {found && (
          <button onClick={restart} className="ml-auto text-[11px] text-ink-400 transition-colors hover:text-signal-600">
            New request
          </button>
        )}
        <Link href="/demos" className={`${found ? '' : 'ml-auto'} text-[11px] text-ink-400 transition-colors hover:text-signal-600`}>
          All demos
        </Link>
      </header>

      {/* -------------------------------------------------------------- rail */}
      <nav aria-label="Journey" className="mx-auto mt-8 w-full max-w-5xl px-4 sm:px-8">
        <ol className="flex items-center">
          {STEPS.map((s, i) => {
            const locked = i > reachable;
            return (
              <li key={s.id} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                {i > 0 && <span className={`h-px flex-1 ${i <= index ? 'bg-signal-600' : 'bg-ink-100'}`} />}
                <button
                  onClick={() => !locked && go(i)}
                  disabled={locked}
                  title={locked ? `${s.rail} — not reached yet` : s.rail}
                  aria-current={i === index ? 'step' : undefined}
                  className="group relative grid h-5 w-5 shrink-0 place-items-center disabled:cursor-default"
                >
                  <span
                    className={`block rounded-full transition-all ${
                      i === index ? 'h-2.5 w-2.5 bg-signal-700'
                      : i < index ? 'h-1.5 w-1.5 bg-signal-600'
                      : 'h-1.5 w-1.5 bg-ink-200'
                    } ${s.human ? 'ring-2 ring-caution-500 ring-offset-2' : ''}`}
                  />
                  <span
                    className={`pointer-events-none absolute top-6 whitespace-nowrap text-[10.5px] transition-opacity ${
                      i === index ? 'text-ink-800 opacity-100' : 'text-ink-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {s.rail}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ------------------------------------------------------------ screen */}
      <main key={step.id} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-48 pt-[5vh] sm:px-8">
        {step.side && (
          <p className="step-in mono mb-5 text-[10.5px] tracking-[0.12em] text-signal-600">
            {step.side === 'customer' ? 'THE CUSTOMER’S SIDE · FIELD’S WEBSITE' : 'FIELD’S SIDE · THE CRM'}
          </p>
        )}
        <div className="max-w-2xl space-y-3">
          {c.lines.map((line, i) => (
            <p
              key={i}
              className={`step-in font-light leading-[1.25] ${i === 0 ? 'text-[26px] text-ink-950 sm:text-[32px]' : 'text-[17px] text-ink-500 sm:text-[20px]'}`}
              style={delay(120 + i * 320)}
            >
              {line}
            </p>
          ))}
        </div>

        {c.halt && (
          <div className="step-in mt-8 max-w-2xl" style={delay(200 + c.lines.length * 320)}>
            <YourDecision done={c.halt.done}>{c.halt.text}</YourDecision>
          </div>
        )}

        {(c.frame || c.body) && (
          <div className="step-in mt-8" style={delay(280 + c.lines.length * 320)}>
            {c.frame ?? c.body}
          </div>
        )}

        {!isLast && !c.hideContinue && (
          <div className="step-in mt-10 flex flex-wrap items-center gap-x-6 gap-y-3" style={delay(450 + c.lines.length * 320)}>
            <button
              onClick={() => go(index + 1)}
              disabled={Boolean(c.blocked)}
              className="rounded-[2px] bg-action-600 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:bg-action-500 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
            >
              {c.cta ?? 'Continue'} →
            </button>
            {c.blocked && <span className="text-[12px] text-caution-600">{c.blocked}</span>}
            {index > 0 && !c.blocked && (
              <button onClick={() => go(index - 1)} className="text-[12.5px] text-ink-400 transition-colors hover:text-signal-600">
                ← Back
              </button>
            )}
          </div>
        )}
        {c.hideContinue && index > 0 && (
          <button onClick={() => go(index - 1)} className="mt-8 text-[12.5px] text-ink-400 transition-colors hover:text-signal-600">
            ← Back
          </button>
        )}
      </main>

      {index >= stepIndex('inbox') && !isLast && <Ledger ledger={ledger} />}
    </div>
  );
}

/* ------------------------------------------------------------------ ledger */

function Ledger({ ledger }: { ledger: { totalBefore: number; before: number; after: number; latest: any } }) {
  const scale = (m: number) => `${(m / ledger.totalBefore) * 100}%`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-5xl px-4 py-3.5 sm:px-8">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <p className="mono text-[10px] tracking-[0.12em] text-ink-400">PEOPLE’S TIME ON THIS ENQUIRY</p>
          {ledger.latest && (
            <p key={ledger.latest.s.id} className="step-in mono hidden text-[10.5px] text-ink-500 sm:block">
              + {ledger.latest.s.ledgerLabel}: {ledger.latest.m.before} → {ledger.latest.m.after} min
            </p>
          )}
        </div>
        <Row label="Today" value={formatMinutes(ledger.before)} width={scale(ledger.before)} colour="bg-ink-300" />
        <Row label="With AI" value={formatMinutes(ledger.after)} width={scale(ledger.after)} colour="bg-signal-600" />
      </div>
    </div>
  );
}

function Row({ label, value, width, colour }: { label: string; value: string; width: string; colour: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <span className="w-14 shrink-0 text-[11px] text-ink-500">{label}</span>
      <div className="h-1.5 flex-1 bg-ink-50">
        <div className={`h-full ${colour} transition-[width] duration-700 ease-out`} style={{ width }} />
      </div>
      <span className="mono w-20 shrink-0 text-right text-[12px] text-ink-800">{value}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- summary */

function Summary({
  before, after, volume, decisions, rfq, brief, onRestart,
}: {
  before: number; after: number; volume: number; decisions: number;
  rfq: SimRfq | null; brief: any | null; onRestart: () => void;
}) {
  const hoursPerYear = Math.round(((before - after) * volume) / 60);
  const checks = rfq ? rfq.lines.length * 4 : 0;
  const docs = brief?.retrieval?.documents?.length ?? 0;
  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200">
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-ink-400">PEOPLE’S TIME TODAY</p>
          <p className="mt-2 text-[30px] font-light text-ink-400">{formatMinutes(before)}</p>
        </div>
        <div className="bg-white px-5 py-6">
          <p className="mono text-[10.5px] tracking-[0.1em] text-signal-600">WITH AI</p>
          <p className="mt-2 text-[30px] font-light text-ink-950">{formatMinutes(after)}</p>
        </div>
      </div>

      {rfq && (
        <p className="step-in mt-8 text-[17px] font-light leading-relaxed text-ink-700" style={{ animationDelay: '300ms' }}>
          The system searched {rfq.considered.toLocaleString()} relevant catalogue records,
          {docs ? ` read ${docs} internal documents,` : ''} logged and routed the enquiry and ran {checks} checks.{' '}
          <span className="text-ink-950">You made {decisions} decisions.</span>
        </p>
      )}

      <p className="step-in mt-6 text-[15px] font-light leading-snug text-ink-600" style={{ animationDelay: '500ms' }}>
        Across {volume.toLocaleString()} enquiries a year, that is roughly {hoursPerYear.toLocaleString()} hours of people’s time given back.
      </p>
      <p className="step-in mt-2 text-[12px] leading-relaxed text-ink-400" style={{ animationDelay: '600ms' }}>
        Illustrative. Times and volumes are demonstration assumptions, not Field measurements — every one is adjustable in{' '}
        <Link href="/roi" className="underline decoration-dotted underline-offset-[3px] hover:text-signal-600">the model</Link>.
      </p>

      <p className="step-in mt-12 text-[15px] leading-relaxed text-ink-700" style={{ animationDelay: '800ms' }}>
        Everything you’ve just used was built from Field’s public catalogue alone. When you want it
        pointed at the real thing, reply to the message this link arrived in.
      </p>

      <div className="step-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: '950ms' }}>
        <button
          onClick={onRestart}
          className="rounded-[2px] border border-ink-300 px-5 py-2.5 text-[13px] text-ink-800 transition-colors hover:border-signal-600 hover:text-signal-700"
        >
          ↺ Try another request
        </button>
        <Link href="/demos" className="text-[13px] text-signal-600 transition-colors hover:text-action-600">
          Explore each demo on its own →
        </Link>
      </div>
    </div>
  );
}
