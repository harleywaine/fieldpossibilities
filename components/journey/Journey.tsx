'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  STEPS, PERSONAS, stepIndex, simulatedLeadDays, matchAccount,
  type StepId, type StepMetric,
} from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import type { CrmAccount, CrmInboxItem, CrmSupplier } from '@/lib/simulation/crm.ts';
import { BrowserFrame, CrmFrame, type CrmModule } from '@/components/journey/frames.tsx';
import { TopBar, Narration, Stage, Dock, Cover, Results, type Halt } from '@/components/journey/shell.tsx';
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
  metrics, accounts, inbox, suppliers,
}: { metrics: Record<string, StepMetric>; accounts: CrmAccount[]; inbox: CrmInboxItem[]; suppliers: CrmSupplier[] }) {
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
  const basket = found ? found.lines.length - sim.excluded.length : 0;
  const crm = (module: CrmModule, user: { name: string; role: string; you?: boolean }, body: React.ReactNode) => (
    <CrmFrame
      module={module}
      user={user}
      badges={{
        Enquiries: inbox.length + (index <= stepIndex('check') ? 1 : 0),
        Engineering: reviewDone ? undefined : pendingReview,
        Procurement: supplierDone ? undefined : 1,
      }}
    >
      {body}
    </CrmFrame>
  );

  type Screen = {
    title: React.ReactNode;
    sub?: React.ReactNode;
    persona?: { name: string; role: string };
    halt?: Halt;
    frame?: React.ReactNode;
    blocked?: string;
    hint?: string;
    cta?: string;
    hideContinue?: boolean;
  };

  const screens: Record<Exclude<StepId, 'start' | 'summary'>, Screen> = {
    request: {
      title: 'You are the customer. What do you need?',
      sub: 'Describe the job on Field’s website the way you would to a supplier. Part numbers aren’t needed.',
      frame: (
        <BrowserFrame path="find-a-part" basket={basket}>
          <RequestScreen value={sim.request} onChange={(v) => patch({ request: v })} onSubmit={find} busy={busy} error={error} />
        </BrowserFrame>
      ),
      cta: 'Continue with these parts',
      hideContinue: !found,
      hint: 'Search on the website to continue',
    },
    parts: {
      title: contact ? 'Your request is on its way to Field.' : 'These are the parts you’ll need.',
      sub: contact
        ? 'Next, the same enquiry from the other side: inside Field.'
        : 'Each one comes from Field’s real catalogue, with the reason it was picked. Request a quote when you’re ready.',
      frame: found && (
        <BrowserFrame path={contact ? 'find-a-part/request-sent' : 'find-a-part/results'} basket={basket}>
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
            onEdit={() => go(stepIndex('request'))}
            accountNames={accounts.map((a) => a.name)}
          />
        </BrowserFrame>
      ),
      cta: 'See it arrive at Field',
      hideContinue: !contact,
      hint: 'Request a quote on the website to continue',
    },
    inbox: {
      title: 'The enquiry arrives at Field.',
      sub: 'Before anyone opens it, the system has logged it, found the account and assigned an owner.',
      frame: rfq && contact && crm('Enquiries', owner,
        <InboxScreen rfq={rfq} contact={contact} account={account} inbox={inbox} owner={owner.name} />),
    },
    account: {
      title: account ? `${owner.name} opens the account.` : `${owner.name} opens the new lead.`,
      sub: account ? `Everything Field holds on ${account.name}, on one screen — with a brief written from its documents.` : `${customerName} is new to Field.`,
      frame: rfq && contact && crm('Accounts', owner,
        <AccountScreen account={account} contact={contact} rfq={rfq} brief={sim.brief} owner={owner.name} />),
    },
    check: {
      title: 'Every line is checked against the catalogue.',
      sub: 'Anything the catalogue doesn’t establish goes to a person, never guessed.',
      frame: rfq && crm('Enquiries', owner,
        <CheckScreen rfq={rfq} customer={customerName} owner={owner.name} />),
    },
    review: {
      title: reviewLines.length ? 'Engineering has lines to decide.' : 'Nothing needs Engineering this time.',
      sub: 'The system shows its reasons for every line. The decision is an engineer’s.',
      persona: PERSONAS.review,
      halt: reviewLines.length ? {
        done: reviewDone,
        text: reviewDone
          ? 'Every line in the queue has a decision.'
          : `${pendingReview} ${pendingReview === 1 ? 'line is' : 'lines are'} waiting in your queue. Approve, query or remove each one.`,
      } : undefined,
      frame: rfq && crm('Engineering', you('review'),
        <ReviewScreen rfq={rfq} customer={customerName} brief={sim.brief} lines={reviewLines} decisions={sim.review} onDecide={(line, d) => setSim((s) => ({ ...s, review: { ...s.review, [line]: d } }))} />),
      blocked: reviewDone ? undefined : 'Decide every line to continue',
    },
    supplier: {
      title: supplierLines.length ? 'Some lead times need confirming.' : 'Every lead time is already known.',
      sub: 'The system drafts the supplier requests. Nothing goes out without Procurement’s approval.',
      persona: PERSONAS.supplier,
      halt: supplierLines.length ? {
        done: sim.supplierSent,
        text: sim.supplierSent
          ? 'Requests sent. The supplier replies are simulated.'
          : 'The drafts are ready. Approve them to send.',
      } : undefined,
      frame: rfq && crm('Procurement', you('supplier'),
        <SupplierScreen rfq={rfq} lines={supplierLines} sent={sim.supplierSent} onSend={() => patch({ supplierSent: true })} replies={replies} suppliers={suppliers} />),
      blocked: supplierDone ? undefined : 'Approve the requests to continue',
    },
    approval: {
      title: 'The quote needs signing off.',
      sub: 'Assembled from the approved lines and confirmed lead times. Prices are set by Commercial, never generated.',
      persona: PERSONAS.approval,
      halt: {
        done: sim.approval === 'approved',
        text: sim.approval === 'approved'
          ? 'Signed off. In this mock-up nothing is actually sent.'
          : 'The quote goes nowhere until you approve it, or return it to Engineering.',
      },
      frame: rfq && contact && crm('Quotes', you('approval'),
        <ApprovalScreen
          rfq={rfq} customer={customerName} contact={contact} included={included} held={held}
          leadDays={leadDays} deliveryDays={deliveryDays} decision={sim.approval}
          reviewed={reviewLines.length} supplierAsked={supplierLines.length} approver={PERSONAS.approval!.name}
          onDecide={(d) => {
            patch({ approval: d });
            if (d === 'returned') go(stepIndex('review'));
          }}
        />),
      blocked: sim.approval === 'approved' ? undefined : 'Approve the quote to continue',
    },
    manufacture: {
      title: 'The customer accepts. The order goes into production.',
      sub: lateCount ? 'One thing needs a decision before it ships.' : 'The system tracks every line until it ships.',
      persona: PERSONAS.manufacture,
      halt: lateCount ? {
        done: Boolean(sim.risk),
        text: sim.risk
          ? `Decided: ${sim.risk.toLowerCase()}.`
          : `${lateCount} ${lateCount === 1 ? 'item' : 'items'} will arrive after the customer’s deadline. Choose how to handle it.`,
      } : undefined,
      frame: rfq && crm('Orders', you('manufacture'),
        <OrderScreen rfq={rfq} customer={customerName} included={included} leadDays={leadDays} decision={sim.risk} onDecide={(d) => patch({ risk: d })} />),
      blocked: riskDone ? undefined : `Decide how to handle the late ${lateCount === 1 ? 'item' : 'items'} to continue`,
    },
  };

  // Until the session is read, a deep link would flash the wrong screen, so show nothing.
  const booting = !loaded && requested > 0;
  const c = booting || step.id === 'start' || step.id === 'summary' ? null : screens[step.id];
  const isLast = index === STEPS.length - 1;
  const next = c && !c.hideContinue && !c.blocked ? () => go(index + 1) : undefined;

  // The arrow keys move through the story, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && (next || step.id === 'start')) go(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, go, index, step.id]);

  const breakdown = STEPS.filter((s) => s.metric && metrics[s.metric]).map((s) => ({
    label: s.ledgerLabel ?? s.rail, before: metrics[s.metric!]!.before, after: metrics[s.metric!]!.after,
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(1200px 500px at 50% -120px, #e3ebf6 0%, transparent 70%), #f5f7fa' }}
    >
      <TopBar index={index} reachable={reachable} go={go} onRestart={restart} canRestart={Boolean(found)} />

      <main key={step.id} className="mx-auto w-full max-w-6xl px-4 pb-36 pt-8 sm:px-8 sm:pt-12">
        {!booting && step.id === 'start' && <Cover onBegin={() => go(1)} />}

        {!booting && step.id === 'summary' && (
          <Results
            before={ledger.totalBefore}
            after={ledger.totalAfter}
            volume={metrics['RFQ preparation']?.volume ?? 1900}
            decisions={decisions}
            considered={rfq?.considered ?? 0}
            docs={sim.brief?.retrieval?.documents?.length ?? 0}
            checks={rfq ? rfq.lines.length * 4 : 0}
            rows={breakdown}
            onRestart={restart}
          />
        )}

        {c && (
          <>
            <Narration step={step} index={index} title={c.title} sub={c.sub} persona={c.persona} halt={c.halt} />
            {c.frame && <Stage>{c.frame}</Stage>}
          </>
        )}
      </main>

      {c && !isLast && (
        <Dock
          canBack={index > 0}
          onBack={() => go(index - 1)}
          onNext={c.hideContinue ? undefined : () => go(index + 1)}
          cta={c.cta ?? 'Continue'}
          blocked={c.blocked}
          hint={c.hideContinue ? c.hint : undefined}
          ledger={ledger}
          showLedger={index >= stepIndex('inbox')}
        />
      )}
    </div>
  );
}
