'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  STEPS, PERSONAS, SITES, PLAYABLE, stepIndex, simulatedLeadDays, simulatedExpedite, matchAccount, sourceFor,
  type StepId, type StepMetric, type DeliveryPlan, type Region, type SiteId, type Channel,
} from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import { priceLines, marginOf, MIN_MARGIN } from '@/lib/simulation/pricing.ts';
import type { CrmAccount, CrmInboxItem, CrmSupplier } from '@/lib/simulation/crm.ts';
import { BrowserFrame, CrmFrame, type CrmModule } from '@/components/journey/frames.tsx';
import { duration } from '@/lib/journey.ts';
import { TopBar, Narration, Stage, Dock, Cover, Results, AiUses, type Halt, type EstimateRow, type CatalogueFacts, Handover, FieldBand, CustomerBand } from '@/components/journey/shell.tsx';
import { RequestScreen, PartsScreen, PersonaBar, type QuoteForm } from '@/components/journey/customer-stages.tsx';
import { SiteSearchProof } from '@/components/journey/site-search.tsx';
import {
  InboxScreen, AccountScreen, CheckScreen, ReviewScreen, SupplyScreen, PricingScreen, ApprovalScreen, OrderScreen,
  type Decision, type Contact,
} from '@/components/journey/crm-stages.tsx';

interface SimState {
  /** Which synthetic customer the viewer is playing, or null for someone new. */
  persona: string | null;
  /** Website form or an email to a regional desk. */
  channel: Channel;
  request: string;
  found: SimRfq | null;
  /** Lines the customer has added to the quote basket. Nothing is added for them. */
  basket: number[];
  form: QuoteForm;
  contact: (Contact & { accountId: string | null }) | null;
  rfq: SimRfq | null;
  brief: any | null;
  review: Record<number, Decision>;
  /** The planner's site per made line, where they overruled the proposal. */
  sites: Record<number, SiteId>;
  /** The supply plan is confirmed and any bought-in requests sent. */
  supplierSent: boolean;
  prices: Record<number, number>;
  pricesConfirmed: boolean;
  /** How late lines are handled, decided before the quote goes out. */
  plan: DeliveryPlan | null;
  approval: 'approved' | 'returned' | null;
  risk: string | null;
}

const STORE = 'field-simulation-v6';
const EMPTY: SimState = {
  persona: null, channel: 'web',
  request: '', found: null, basket: [], form: { email: '', company: '' }, contact: null,
  rfq: null, brief: null, review: {}, sites: {}, supplierSent: false, prices: {}, pricesConfirmed: false, plan: null, approval: null, risk: null,
};
const DOWNSTREAM: Partial<SimState> = {
  contact: null, rfq: null, brief: null, review: {}, sites: {}, supplierSent: false, prices: {}, pricesConfirmed: false, plan: null, approval: null, risk: null,
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
  metrics, accounts, inbox, suppliers, catalogue,
}: {
  metrics: Record<string, StepMetric>; accounts: CrmAccount[]; inbox: CrmInboxItem[]; suppliers: CrmSupplier[];
  catalogue: CatalogueFacts | null;
}) {
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
  const picked = accounts.find((a) => a.id === sim.persona) ?? null;
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /** Playing a customer fills in who they are and a request in their fleet's words. */
  const pick = (accountId: string | null) => {
    const a = accounts.find((x) => x.id === accountId) ?? null;
    const example = PLAYABLE.find((p) => p.accountId === accountId)?.request ?? '';
    setSim((s) => {
      const keep = s.request.trim() && !PLAYABLE.some((p) => p.request === s.request);
      return {
        ...s,
        persona: accountId,
        form: a ? { email: `procurement@${slug(a.name)}.example`, company: a.name } : { email: '', company: '' },
        request: keep ? s.request : example,
      };
    });
  };

  const reviewLines = rfq?.lines.filter((l) => l.flags.some((f) => f.kind === 'review')) ?? [];
  const reviewDone = reviewLines.every((l) => sim.review[l.line]);
  const included = rfq?.lines.filter((l) => !sim.review[l.line] || sim.review[l.line] === 'approve') ?? [];
  const held = rfq?.lines.filter((l) => sim.review[l.line] && sim.review[l.line] !== 'approve') ?? [];
  const supplierLines = included.filter((l) => l.flags.some((f) => f.kind === 'supplier'));

  // Where each line comes from: Field's own sites, stock, or a bought-in range.
  const region: Region = ((account ?? picked)?.region as Region | undefined) ?? 'EMEA';
  const sourceOf = useCallback((l: SimLine) => sourceFor(l, region), [region]);
  const boughtIn = included.filter((l) => sourceOf(l).kind === 'bought-in');
  const supplierDone = sim.supplierSent;
  const siteOf = (l: SimLine): SiteId | null => {
    const s = sourceOf(l);
    return s.kind === 'make' ? (sim.sites[l.line] ?? s.proposed) : s.kind === 'stock' ? s.site : null;
  };
  const sourceLabel = (l: SimLine): string => {
    const s = sourceOf(l);
    if (s.kind === 'bought-in') return s.supplier;
    const site = SITES[siteOf(l)!];
    return s.kind === 'stock' ? `Ex-stock, ${site.name}` : `${site.name}, ${site.country}`;
  };
  // SIMULATED replies to the bought-in requests, stable per part.
  const replies = Object.fromEntries(boughtIn.map((l) => [l.line, simulatedLeadDays(l.partNumber, l.leadTimeDays)]));
  /** Door-to-door days for a line under the supply plan. */
  const leadDays = (l: SimLine): number => {
    const s = sourceOf(l);
    if (s.kind === 'stock') return s.days;
    if (s.kind === 'make') return s.options.find((o) => o.site === siteOf(l))!.totalDays;
    return replies[l.line] ?? simulatedLeadDays(l.partNumber, l.leadTimeDays);
  };
  const deadline = rfq?.deadlineDays ?? null;
  const lateLines = included.filter((l) => deadline !== null && leadDays(l) > deadline);
  const lateCount = lateLines.length;
  // SIMULATED supplier answers to an expedite request, stable per part.
  const expedite = Object.fromEntries(lateLines.map((l) => [l.line, simulatedExpedite(l.partNumber)]));
  /** Lead time once the delivery plan is applied: an accepted expedite lands on the deadline. */
  const plannedDays = (l: SimLine) => {
    const d = leadDays(l);
    if (sim.plan === 'expedite' && deadline !== null && d > deadline && expedite[l.line]?.accepted) return deadline;
    return d;
  };
  const deliveryDays = included.length ? Math.max(...included.map(plannedDays)) : null;
  // Phasing and honest dates settle the late lines at quote time; only a refused
  // expedite leaves Operations something to decide once the order is in.
  const stillLate = sim.plan === 'expedite' ? lateLines.filter((l) => plannedDays(l) > deadline!) : [];
  const planDone = lateCount === 0 || Boolean(sim.plan);
  const riskDone = stillLate.length === 0 || Boolean(sim.risk);

  /** The furthest step the viewer may reach — they can't jump past a decision. */
  const reachable = useMemo(() => {
    if (!found) return stepIndex('request');
    if (!contact || !rfq) return stepIndex('parts');
    if (!reviewDone) return stepIndex('review');
    if (!supplierDone) return stepIndex('supplier');
    if (!sim.pricesConfirmed) return stepIndex('pricing');
    if (!planDone || sim.approval !== 'approved') return stepIndex('approval');
    if (!riskDone) return stepIndex('manufacture');
    return STEPS.length - 1;
  }, [found, contact, rfq, reviewDone, supplierDone, sim.pricesConfirmed, planDone, sim.approval, riskDone]);

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
  /** The catalogue search behind both channels. */
  const search = async (q: string): Promise<SimRfq> => {
    const res = await fetch('/api/simulate/rfq', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    });
    const data: SimRfq & { error?: string } = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'The search failed.');
    if (!data.lines.length) throw new Error('Nothing in the catalogue matched that. Try naming the aircraft or the job.');
    return data;
  };

  /** The account research runs in the background, so the brief is ready when the account screen is reached. */
  const research = (matched: CrmAccount | null, data: SimRfq) => {
    if (!matched) return;
    const about = [data.aircraft, data.engine, 'tooling'].filter(Boolean).join(' ');
    fetch('/api/knowledge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: `I've received an enquiry from ${matched.name} for ${about}. Tell me everything I need to know before I respond.` }),
    }).then((r) => r.json()).then((d) => patch({ brief: d.brief ?? null })).catch(() => {});
  };

  const jump = (id: StepId) => {
    window.history.pushState(null, '', `?s=${stepIndex(id)}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  /** Website: find the parts, then the customer picks and sends. */
  const find = async () => {
    const q = sim.request.trim();
    if (q.length < 3 || busy) return;
    setBusy(true); setError(null);
    try {
      const data = await search(q);
      setSim((s) => ({ ...s, ...DOWNSTREAM, found: data, basket: [] }));
      jump('parts');
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
      .filter((l) => sim.basket.includes(l.line))
      .map((l, i) => ({ ...l, line: i + 1 }));
    setSim((s) => ({
      ...s, ...DOWNSTREAM,
      rfq: { ...found, lines },
      contact: { email: s.form.email.trim(), company: s.form.company.trim(), accountId: matched?.id ?? null },
    }));
    research(matched, found);
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
  const decisions = Object.keys(sim.review).length + (sim.supplierSent ? 1 : 0) + (sim.pricesConfirmed ? 1 : 0)
    + (sim.plan ? 1 : 0) + (sim.approval === 'approved' ? 1 : 0) + (sim.risk ? 1 : 0);
  const pendingReview = reviewLines.filter((l) => !sim.review[l.line]).length;
  const you = (id: StepId) => ({ ...PERSONAS[id]!, you: true });
  const basket = sim.basket.length;
  // SYNTHETIC prices, seeded per part; the viewer's own figures override the suggestion.
  const linePrices = useMemo(
    () => priceLines(included, account?.id ?? null, (name) => {
      // Freight in the synthetic price follows where the line is made or bought.
      const l = included.find((x) => x.name === name);
      const s = l ? sourceOf(l) : null;
      if (!s || s.kind === 'bought-in') return 'United States';
      return SITES[s.kind === 'stock' ? s.site : (sim.sites[l!.line] ?? s.proposed)].country;
    }, account?.fleet ?? []),
    [included.map((l) => l.partNumber).join('|'), account?.id, suppliers, account?.fleet, sim.sites, sourceOf],
  );
  const finalPrices = Object.fromEntries(linePrices.map((p) => [p.line, sim.prices[p.line] ?? p.suggested]));
  const quoteMargin = marginOf(
    linePrices.reduce((a, p) => a + finalPrices[p.line]!, 0),
    linePrices.reduce((a, p) => a + p.landed, 0),
  );
  const crm = (module: CrmModule, user: { name: string; role: string; you?: boolean }, body: React.ReactNode) => (
    <CrmFrame
      module={module}
      user={user}
      badges={{
        Enquiries: inbox.length + (index <= stepIndex('check') ? 1 : 0),
        Engineering: reviewDone ? undefined : pendingReview,
        Supply: supplierDone ? undefined : 1,
      }}
    >
      {body}
    </CrmFrame>
  );

  type Screen = {
    eyebrow?: string;
    /** Rendered between the narration and the window. */
    pre?: React.ReactNode;
    body?: React.ReactNode;
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
    uses: {
      eyebrow: 'Before you start',
      title: 'Nine ways AI could work at Field.',
      sub: 'Each is one step in the enquiry you’re about to follow. They’re based on what we know about Field from the outside, and they show where people still decide.',
      body: <AiUses catalogue={catalogue} />,
      cta: 'Start the enquiry',
    },
    request: {
      title: 'You’re the customer.',
      sub: 'Describe the job on Field’s website the way you would to a supplier. Part numbers aren’t needed.',
      halt: { done: Boolean(found), text: found ? 'You described the job and searched.' : 'Describe the job and search. Nothing happens until you do.' },
      pre: <PersonaBar accounts={accounts} chosen={sim.persona} onPick={pick} />,
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
      title: contact ? 'Request sent.' : 'These are the parts you’ll need.',
      sub: contact
        ? 'Field has it. Next, the same enquiry from the other side.'
        : 'Each one comes from Field’s real catalogue, with the reason it was picked. Add the ones you want and request a quote.',
      halt: { done: Boolean(contact), text: contact ? 'You sent the request to Field.' : 'Add the parts you want quoted, then request the quote.' },
      body: found && (contact ? <Handover company={contact.company} onNext={() => go(stepIndex('inbox'))} /> : <SiteSearchProof />),
      cta: contact ? 'Open Field’s inbox' : undefined,
      frame: found && (
        <BrowserFrame path={contact ? 'find-a-part/request-sent' : 'find-a-part/results'} basket={basket}>
          <PartsScreen
            found={found}
            basket={sim.basket}
            onToggle={(line) => setSim((s) => ({
              ...s, basket: s.basket.includes(line) ? s.basket.filter((x) => x !== line) : [...s.basket, line],
            }))}
            form={sim.form}
            onForm={(form) => patch({ form })}
            sent={contact && rfq ? { email: contact.email, company: contact.company, reference: rfq.reference } : null}
            onSend={send}
            onEdit={() => go(stepIndex('request'))}
            accountNames={accounts.map((a) => a.name)}
            channel={sim.channel}
          />
        </BrowserFrame>
      ),
      hideContinue: !contact,
      hint: 'Request a quote on the website to continue',
    },
    inbox: {
      title: sim.channel === 'email' ? 'The email lands in the desk mailbox.' : 'The enquiry arrives at Field.',
      sub: sim.channel === 'email'
        ? 'Before anyone opens the mailbox, the system has read it, found the parts, matched the account and routed it to the right desk.'
        : 'Before anyone opens it, the system has logged it, found the account and assigned an owner.',
      frame: rfq && contact && crm('Enquiries', owner,
        <InboxScreen rfq={rfq} contact={contact} account={account} inbox={inbox} owner={owner.name} channel={sim.channel} region={region} />),
    },
    account: {
      title: account ? `${owner.name} opens the account.` : `${owner.name} opens the new lead.`,
      sub: account ? `Everything Field holds on ${account.name}, on one screen, with a brief written from its documents.` : `${customerName} is new to Field.`,
      frame: rfq && contact && crm('Accounts', owner,
        <AccountScreen account={account} contact={contact} rfq={rfq} brief={sim.brief} owner={owner.name} />),
    },
    check: {
      title: 'Each part, checked against its catalogue record.',
      sub: 'Two questions per part: does it fit the aircraft they named, and can it arrive by the date they need? Only what the record can’t settle goes to a person.',
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
      title: 'Where will each line come from?',
      sub: `Field makes Boeing-licensed tooling in Poole, Singapore, China and India, and buys some ranges in. The system proposes the fastest source for a customer in ${region}; a planner confirms or overrules it.`,
      persona: PERSONAS.supplier,
      halt: {
        done: sim.supplierSent,
        text: sim.supplierSent
          ? `Plan confirmed${boughtIn.length ? ', supplier requests sent' : ''}. Stock, site lead times and replies are simulated.`
          : `A source is proposed for every line${supplierLines.length ? `, including the ${supplierLines.length === 1 ? 'one' : supplierLines.length} the line check flagged` : ''}. Change any site you disagree with, then confirm the plan.`,
      },
      frame: rfq && crm('Supply', you('supplier'),
        <SupplyScreen
          rfq={rfq} lines={included} region={region} sourceOf={sourceOf}
          sites={sim.sites} onSite={(line, site) => setSim((s) => ({ ...s, sites: { ...s.sites, [line]: site } }))}
          confirmed={sim.supplierSent} onConfirm={() => patch({ supplierSent: true })} replies={replies}
        />),
      blocked: supplierDone ? undefined : 'Confirm the plan to continue',
    },
    pricing: {
      title: 'The quote needs pricing.',
      sub: 'The system builds each price and flags anything odd. The prices are synthetic, Field publishes none, and the final figure is a person’s.',
      persona: PERSONAS.pricing,
      halt: {
        done: sim.pricesConfirmed,
        text: sim.pricesConfirmed
          ? 'Prices set. Change any of them before sign-off if you need to.'
          : 'A price is suggested for every line. Adjust any you disagree with, then confirm.',
      },
      frame: rfq && crm('Quotes', you('pricing'),
        <PricingScreen
          rfq={rfq} customer={customerName} account={account} lines={included} prices={linePrices}
          chosen={sim.prices} onPrice={(line, price) => setSim((s) => ({ ...s, prices: { ...s.prices, [line]: price } }))}
          confirmed={sim.pricesConfirmed} onConfirm={() => patch({ pricesConfirmed: true })} sourceLabel={sourceLabel}
        />),
      blocked: sim.pricesConfirmed ? undefined : 'Confirm the prices to continue',
    },
    approval: {
      title: lateCount && !sim.plan ? 'The quote misses the deadline. Decide before it goes out.' : 'The quote needs signing off.',
      sub: lateCount && !sim.plan
        ? `${lateCount === 1 ? 'One line lands' : `${lateCount} lines land`} after the customer’s ${duration(deadline!)}. The system shows the options; Commercial chooses, and the customer sees the choice on the quote.`
        : 'Assembled from the approved lines, confirmed lead times and the prices just set. Synthetic prices, clearly marked.',
      persona: PERSONAS.approval,
      halt: {
        done: sim.approval === 'approved',
        text: sim.approval === 'approved'
          ? 'Signed off. In this mock-up nothing is actually sent.'
          : lateCount && !sim.plan
            ? 'Choose how the late lines are handled, then approve the quote or return it to Engineering.'
            : 'The quote goes nowhere until you approve it, or return it to Engineering.',
      },
      frame: rfq && contact && crm('Quotes', you('approval'),
        <ApprovalScreen
          rfq={rfq} customer={customerName} contact={contact} included={included} held={held}
          leadDays={plannedDays} deliveryDays={deliveryDays} decision={sim.approval}
          reviewed={reviewLines.length} supplierAsked={supplierLines.length} approver={PERSONAS.approval!.name}
          prices={finalPrices} margin={quoteMargin} pricedBy={PERSONAS.pricing!.name}
          belowMin={linePrices.filter((p) => marginOf(finalPrices[p.line]!, p.landed) < MIN_MARGIN).length}
          lateLines={lateLines} plan={sim.plan} onPlan={(plan) => patch({ plan, risk: null })} expedite={expedite}
          queried={held.filter((l) => sim.review[l.line] === 'query')} sourceLabel={sourceLabel}
          onDecide={(d) => {
            patch({ approval: d });
            if (d === 'returned') go(stepIndex('review'));
          }}
        />),
      blocked: sim.approval === 'approved' ? undefined : lateCount && !sim.plan ? 'Choose how to handle the late lines, then approve' : 'Approve the quote to continue',
    },
    manufacture: {
      title: sim.plan === 'phased'
        ? 'The customer accepts a phased delivery. The order goes into production.'
        : sim.plan === 'realistic'
          ? 'The customer accepts the dates quoted. The order goes into production.'
          : 'The customer accepts. The order goes into production.',
      sub: stillLate.length
        ? 'The expedite didn’t come off on every line. One thing needs a decision before it ships.'
        : sim.plan === 'expedite' ? 'The expedited lines are tracked against the deadline until they ship.' : 'The system tracks every line until it ships.',
      persona: PERSONAS.manufacture,
      halt: stillLate.length ? {
        done: Boolean(sim.risk),
        text: sim.risk
          ? `Decided: ${sim.risk.toLowerCase()}.`
          : `${stillLate.length} ${stillLate.length === 1 ? 'line' : 'lines'} couldn’t be expedited and will arrive after the deadline. Choose how to handle it.`,
      } : undefined,
      frame: rfq && crm('Orders', you('manufacture'),
        <OrderScreen
          rfq={rfq} customer={customerName} included={included} leadDays={plannedDays} catalogueDays={leadDays}
          plan={sim.plan} expedite={expedite} stillLate={stillLate} decision={sim.risk} onDecide={(d) => patch({ risk: d })} sourceLabel={sourceLabel}
        />),
      blocked: riskDone ? undefined : `Decide how to handle the late ${stillLate.length === 1 ? 'line' : 'lines'} to continue`,
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
      if (document.body.dataset.dialog) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && (next || step.id === 'start')) go(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, go, index, step.id]);

  const breakdown: EstimateRow[] = STEPS.filter((s) => s.metric && metrics[s.metric]).map((s) => ({
    process: s.metric!, label: s.ledgerLabel ?? s.rail,
    before: metrics[s.metric!]!.before, after: metrics[s.metric!]!.after, volume: metrics[s.metric!]!.volume,
  }));

  // Two worlds: the customer's side is light and open; inside Field is navy and close.
  const side = step.side;
  const who = side === 'customer'
    ? { name: picked?.name ?? (contact?.company || sim.form.company || 'Someone new'), role: picked ? `Customer · ${picked.country}` : 'A company new to Field' }
    : side === 'field' ? { name: owner.name, role: `${owner.role}, Field` } : undefined;
  const narration = c && (
    <Narration
      step={step} index={index} title={c.title} sub={c.sub} halt={c.halt} eyebrow={c.eyebrow}
      persona={c.persona ?? who}
      tone={side === 'field' ? 'dark' : 'light'}
      onChangePersona={side === 'customer' && step.id !== 'request' ? () => go(stepIndex('request')) : undefined}
    />
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: side === 'field'
          ? '#e6ebf2'
          : side === 'customer'
            ? 'radial-gradient(1200px 520px at 50% -120px, #cfe3f6 0%, transparent 70%), #eef4fa'
            : 'radial-gradient(1200px 500px at 50% -120px, #e3ebf6 0%, transparent 70%), #f5f7fa',
      }}
    >
      {/* The bar arrives with the journey: the cover and the preamble stand alone. */}
      {!booting && step.id !== 'start' && step.id !== 'uses' && (
        <TopBar index={index} reachable={reachable} go={go} onRestart={restart} canRestart={Boolean(found)} />
      )}

      {!booting && step.id === 'start' && <Cover onBegin={() => go(1)} catalogue={catalogue} />}

      {!booting && side === 'field' && c && <FieldBand>{narration}</FieldBand>}
      {!booting && side === 'customer' && c && <CustomerBand>{narration}</CustomerBand>}

      <main key={step.id} className={`mx-auto w-full max-w-6xl px-4 pb-36 sm:px-8 ${step.id === 'start' ? 'hidden' : step.id === 'uses' ? 'pt-10 sm:pt-16' : side === 'field' ? '-mt-16' : side === 'customer' ? 'pt-2 sm:pt-4' : 'pt-8 sm:pt-12'}`}>

        {!booting && step.id === 'summary' && (
          <Results
            before={ledger.totalBefore}
            after={ledger.totalAfter}
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
            {!side && narration}
            {c.pre}
            {c.frame && <Stage>{c.frame}</Stage>}
            {c.body}
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
          estimates={breakdown}
        />
      )}
    </div>
  );
}
