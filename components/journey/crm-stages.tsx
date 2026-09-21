'use client';

import { aircraftLabel, duration, gbp, shortDate, supplierFor } from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import type { CrmAccount, CrmInboxItem } from '@/lib/simulation/crm.ts';
import { Choice, Panel, Pill, type Tone } from '@/components/journey/frames.tsx';

export type Decision = 'approve' | 'remove' | 'query';
export interface Contact { email: string; company: string }

const T = (ms: number) => ({ animationDelay: `${ms}ms` });

function Part({ l }: { l: SimLine }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-3">
      <span className="mono w-24 shrink-0 text-[11.5px] text-signal-600">{l.partNumber ?? '—'}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-800">{l.name}</span>
    </span>
  );
}

const STATUS: Record<string, { tone: Tone; text: string }> = {
  won: { tone: 'green', text: 'Won' },
  lost: { tone: 'red', text: 'Lost' },
  quoted: { tone: 'blue', text: 'Quoted' },
  open: { tone: 'amber', text: 'Open' },
};

/* ------------------------------------------------------------------ inbox */

export function InboxScreen({
  rfq, contact, account, inbox, newLeadOwner,
}: {
  rfq: SimRfq; contact: Contact; account: CrmAccount | null; inbox: CrmInboxItem[];
  newLeadOwner: string;
}) {
  const owner = account?.owner?.name ?? newLeadOwner;
  const done: string[] = [
    account ? `Matched to the account ${account.name}, by company name` : `No account for ${contact.company}, so a new lead was opened`,
    `Logged as enquiry ${rfq.reference}, with ${rfq.lines.length} ${rfq.lines.length === 1 ? 'part' : 'parts'} attached`,
    account?.owner ? `Assigned to ${owner}, the account owner` : `Assigned to ${owner}, who takes new leads`,
    ...(rfq.deadlineDays ? [`Deadline read from the message: ${rfq.deadlineDays} days`] : []),
    `Acknowledgement sent to ${contact.email} (simulated)`,
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
      <Panel title="Inbox" aside={`${inbox.length + 1} open`}>
        <ul className="divide-y divide-ink-100">
          <li className="step-in border-l-2 border-signal-600 bg-signal-50/60 px-3 py-2.5" style={T(150)}>
            <p className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-ink-900">
              <span className="truncate">{account?.name ?? contact.company}</span>
              <Pill tone="red">New</Pill>
            </p>
            <p className="truncate text-[11px] text-ink-600">Quote request · {rfq.lines.length} parts</p>
            <p className="text-[10px] text-ink-400">Just now</p>
          </li>
          {inbox.map((m) => (
            <li key={m.reference} className="px-3 py-2.5 opacity-80">
              <p className="truncate text-[11.5px] text-ink-800">{m.customer}</p>
              <p className="truncate text-[11px] text-ink-500">{m.subject}</p>
              <p className="text-[10px] text-ink-400">{shortDate(m.date)} · {m.status}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="min-w-0 space-y-4">
        <Panel title={`Quote request · ${rfq.lines.length} parts`} aside={rfq.reference}>
          <div className="px-4 py-3 text-[12px]">
            <p className="text-ink-500">
              From <span className="text-ink-900">{contact.email}</span> · {contact.company} · via Find a part
            </p>
            <p className="mt-3 border-l-2 border-ink-100 pl-3 text-[13px] leading-relaxed text-ink-800">“{rfq.request}”</p>
            <ul className="mt-3 space-y-1">
              {rfq.lines.map((l) => (
                <li key={l.line} className="flex"><Part l={l} /></li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Done automatically, before anyone opened it">
          <ul className="space-y-1.5 px-4 py-3">
            {done.map((d, i) => (
              <li key={d} className="step-in flex gap-2.5 text-[12px] text-ink-700" style={T(500 + i * 380)}>
                <span className="text-strong-600">✓</span>{d}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- account */

const BRIEF = ['Previous interactions', 'Previous quote', 'Technical position', 'Potential issue'];

export function AccountScreen({
  account, contact, rfq, brief,
}: { account: CrmAccount | null; contact: Contact; rfq: SimRfq; brief: any | null }) {
  const newJob = (
    <tr className="bg-signal-50/60">
      <td className="mono whitespace-nowrap py-1.5 pl-4 pr-2 text-signal-700">{rfq.reference}</td>
      <td className="px-2 text-ink-500">Today</td>
      <td className="px-2 text-ink-800">{[aircraftLabel(rfq.aircraft), `${rfq.lines.length} parts`].filter(Boolean).join(' · ')}</td>
      <td className="px-2"><Pill tone="red">New</Pill></td>
      <td className="pr-4 text-right text-ink-400">—</td>
    </tr>
  );

  if (!account) {
    return (
      <div className="space-y-4">
        <Panel title={contact.company} aside="New lead">
          <div className="px-4 py-3 text-[12.5px] leading-relaxed text-ink-600">
            <p>Contact: <span className="text-ink-900">{contact.email}</span></p>
            <p className="mt-2">
              No account, jobs, cases or correspondence on record for this company. The system searched the CRM
              for similar names and found none, so it opened a new lead. With no history, a salesperson would
              normally call to qualify it.
            </p>
          </div>
        </Panel>
        <Panel title="Jobs">
          <table className="w-full text-[11.5px]"><tbody>{newJob}</tbody></table>
        </Panel>
      </div>
    );
  }

  const open = account.cases.filter((c) => c.status === 'Open');
  const openComplaint = open.some((c) => c.kind === 'Complaint');
  const health: { tone: Tone; text: string } = openComplaint
    ? { tone: 'red', text: 'Open complaint' }
    : open.length ? { tone: 'amber', text: `${open.length} open ${open.length === 1 ? 'case' : 'cases'}` }
    : { tone: 'green', text: 'No open cases' };
  const kpis: Array<[string, string]> = [
    ['Annual spend', gbp(account.annualSpendGbp)],
    ['Won to date', account.stats.wonGbp ? gbp(account.stats.wonGbp) : '—'],
    ['Win rate', account.stats.winRatePct === null ? '—' : `${account.stats.winRatePct}%`],
    ['Open quotes', account.stats.pipelineGbp ? gbp(account.stats.pipelineGbp) : '—'],
    ['Enquiries', String(account.stats.enquiries + 1)],
  ];
  const fields = brief ? BRIEF.map((l) => brief.fields.find((f: any) => f.label === l)).filter(Boolean) : [];

  return (
    <div className="space-y-4">
      {/* header */}
      <section className="step-in rounded-[4px] border border-ink-100 bg-white px-4 py-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold tracking-tight text-ink-950">{account.name}</p>
            <p className="mt-0.5 text-[11.5px] text-ink-500">
              {account.type} · {account.country} · customer since {account.since.slice(0, 4)} · {account.paymentTerms} terms
            </p>
            <p className="mt-1.5 flex flex-wrap gap-1">
              {account.fleet.map((f) => <Pill key={f} tone="grey">{f}</Pill>)}
            </p>
          </div>
          <div className="text-right text-[11px] text-ink-500">
            <Pill tone={health.tone}>{health.text}</Pill>
            {account.owner && <p className="mt-1.5">Owner: <span className="text-ink-800">{account.owner.name}</span></p>}
            <p>New contact: <span className="text-ink-800">{contact.email}</span></p>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] italic text-ink-500">“{account.notes}”</p>
      </section>

      {/* numbers */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-ink-100 bg-ink-100 sm:grid-cols-5">
        {kpis.map(([k, v], i) => (
          <div key={k} className="step-in bg-white px-3 py-2.5" style={T(100 + i * 70)}>
            <p className="text-[10px] text-ink-400">{k}</p>
            <p className="mt-0.5 text-[16px] font-light text-ink-950">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Panel title="Recent jobs" aside={`${account.stats.enquiries + 1} enquiries`}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <tbody className="divide-y divide-ink-100">
                {newJob}
                {account.jobs.map((j) => (
                  <tr key={j.reference}>
                    <td className="mono py-1.5 pl-4 pr-2 text-ink-600">{j.reference}</td>
                    <td className="whitespace-nowrap px-2 text-ink-500">{shortDate(j.date)}</td>
                    <td className="px-2 text-ink-800">{[j.aircraft, j.application?.toLowerCase()].filter(Boolean).join(' · ')}</td>
                    <td className="px-2"><Pill tone={STATUS[j.status].tone}>{STATUS[j.status].text}</Pill></td>
                    <td className="mono whitespace-nowrap pr-4 text-right text-ink-700">{j.valueGbp ? gbp(j.valueGbp) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Complaints and cases" aside={`${open.length} open`}>
          {account.cases.length ? (
            <ul className="divide-y divide-ink-100">
              {account.cases.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <p className="flex items-center gap-2 text-[11.5px]">
                    <Pill tone={c.status === 'Open' ? (c.kind === 'Complaint' ? 'red' : 'amber') : 'grey'}>{c.kind} · {c.status}</Pill>
                    <span className="text-[10.5px] text-ink-400">{shortDate(c.opened)}</span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-900">{c.subject}</p>
                  <p className="text-[11px] leading-snug text-ink-500">{c.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-[12px] text-ink-500">No complaints or cases on record.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Panel title="Recent activity">
          <ul className="divide-y divide-ink-100">
            {account.activity.map((a) => (
              <li key={a.title + a.date} className="px-4 py-2">
                <p className="text-[10.5px] text-ink-400">{shortDate(a.date)} · {a.kind.replace('-', ' ')}{a.author ? ` · ${a.author}` : ''}</p>
                <p className="truncate text-[11.5px] text-ink-800">{a.title}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Before you reply" aside={brief ? `from ${brief.retrieval?.documents?.length ?? 0} internal documents` : 'reading…'}>
          {!brief ? (
            <p className="mono px-4 py-3 text-[10.5px] tracking-[0.08em] text-ink-300">READING THE ACCOUNT…</p>
          ) : fields.length ? (
            <dl className="divide-y divide-ink-100">
              {fields.map((f: any, i: number) => (
                <div key={f.label} className="step-in px-4 py-2" style={T(i * 120)}>
                  <dt className="text-[10.5px] text-ink-400">{f.label}</dt>
                  <dd className="text-[12px] leading-snug text-ink-800">{f.value}</dd>
                  {f.citations?.[0] && <p className="mono mt-0.5 text-[9.5px] text-ink-300">{f.citations[0].path}</p>}
                </div>
              ))}
            </dl>
          ) : (
            <p className="px-4 py-3 text-[12px] text-ink-500">Little on file beyond the profile — itself worth knowing before replying.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ check */

const has = (l: SimLine, kind: 'review' | 'supplier') => l.flags.some((f) => f.kind === kind);

export function CheckScreen({ rfq, customer, owner }: { rfq: SimRfq; customer: string; owner: string }) {
  const ready = rfq.lines.filter((l) => !l.flags.length).length;
  const toEng = rfq.lines.filter((l) => has(l, 'review')).length;
  const toProc = rfq.lines.filter((l) => has(l, 'supplier')).length;
  const info: Array<[string, string]> = [
    ['Customer', customer],
    ['Owner', owner],
    ['Aircraft', rfq.aircraft ? `${aircraftLabel(rfq.aircraft)}${rfq.variant ? ` (-${rfq.variant} stated)` : ''}` : 'Not stated'],
    ['Engine', rfq.engine ?? 'Not stated'],
    ['Needed within', rfq.deadlineDays ? `${rfq.deadlineDays} days` : 'Not stated'],
  ];
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[4px] border border-ink-100 bg-white px-4 py-3 sm:grid-cols-5">
        {info.map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] text-ink-400">{k}</p>
            <p className="text-[12px] text-ink-900">{v}</p>
          </div>
        ))}
      </section>
      <Panel title="Lines" aside={`${ready} ready · ${toEng} to Engineering · ${toProc} to Procurement`}>
        <ul className="divide-y divide-ink-100">
          {rfq.lines.map((l, i) => {
            return (
              <li key={l.line} className="step-in px-4 py-2.5" style={T(i * 160)}>
                <div className="flex items-center gap-3">
                  <span className="mono w-5 shrink-0 text-[10.5px] text-ink-300">{String(l.line).padStart(2, '0')}</span>
                  <Part l={l} />
                  <span className="flex shrink-0 gap-1">
                    {!l.flags.length && <Pill tone="green">Ready</Pill>}
                    {has(l, 'review') && <Pill tone="amber">Engineering</Pill>}
                    {has(l, 'supplier') && <Pill tone="blue">Procurement</Pill>}
                  </span>
                </div>
                {l.flags.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-8">
                    {l.flags.map((f, j) => (
                      <li key={j} className="text-[11px] leading-snug text-ink-500">{f.reason}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------------- review */

export function ReviewScreen({
  rfq, lines, decisions, onDecide,
}: { rfq: SimRfq; lines: SimLine[]; decisions: Record<number, Decision>; onDecide: (line: number, d: Decision) => void }) {
  const pending = lines.filter((l) => !decisions[l.line]);
  if (!lines.length) {
    return (
      <Panel title="Review queue">
        <p className="px-4 py-4 text-[12.5px] text-ink-600">Nothing in the queue for {rfq.reference}: every line establishes what the customer asked for.</p>
      </Panel>
    );
  }
  return (
    <Panel title={`Review queue · ${rfq.reference}`} aside={`${pending.length} awaiting you`}>
      <ul className="divide-y divide-ink-100">
        {lines.map((l) => {
          const d = decisions[l.line];
          return (
            <li key={l.line} className={`px-4 py-3 ${d ? '' : 'bg-caution-500/[0.04]'}`}>
              <div className="flex"><Part l={l} /></div>
              <ul className="mt-1 space-y-0.5 pl-[108px]">
                {l.flags.filter((f) => f.kind === 'review').map((f, i) => (
                  <li key={i} className="text-[11.5px] leading-snug text-ink-500">{f.reason}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[108px]">
                <Choice active={d === 'approve'} tone="go" onClick={() => onDecide(l.line, 'approve')}>Approve for the quote</Choice>
                <Choice active={d === 'query'} onClick={() => onDecide(l.line, 'query')}>Ask the customer</Choice>
                <Choice active={d === 'remove'} tone="stop" onClick={() => onDecide(l.line, 'remove')}>Remove</Choice>
              </div>
            </li>
          );
        })}
      </ul>
      {pending.length > 0 && pending.length < lines.length && (
        <div className="border-t border-ink-100 px-4 py-2.5">
          <button onClick={() => pending.forEach((l) => onDecide(l.line, 'approve'))} className="text-[11.5px] text-signal-600 hover:text-action-600">
            Approve the remaining {pending.length} →
          </button>
        </div>
      )}
    </Panel>
  );
}

/* --------------------------------------------------------------- supplier */

export function SupplierScreen({
  lines, sent, onSend, replies, deadlineDays,
}: {
  lines: SimLine[]; sent: boolean; onSend: () => void;
  replies: Record<number, number>; deadlineDays: number | null;
}) {
  if (!lines.length) {
    return (
      <Panel title="Lead-time enquiries">
        <p className="px-4 py-4 text-[12.5px] text-ink-600">Nothing to ask: every line has a published lead time inside the deadline.</p>
      </Panel>
    );
  }
  const bySupplier = new Map<string, SimLine[]>();
  for (const l of lines) {
    const s = supplierFor(l.name);
    bySupplier.set(s, [...(bySupplier.get(s) ?? []), l]);
  }
  return (
    <div className="space-y-4">
      {[...bySupplier.entries()].map(([supplier, ls], si) => (
        <Panel key={supplier} title={supplier} aside={sent ? 'Sent · reply received (simulated)' : 'Draft'}>
          {!sent && (
            <p className="border-b border-ink-100 px-4 py-2.5 text-[11.5px] leading-relaxed text-ink-600">
              “Please confirm your current lead time for the items below, for delivery to Field. We are quoting a
              customer who needs them within {deadlineDays ? `${deadlineDays} days` : 'a stated window'}.”
            </p>
          )}
          <ul className="divide-y divide-ink-100">
            {ls.map((l, i) => {
              const days = replies[l.line];
              const late = deadlineDays !== null && days > deadlineDays;
              return (
                <li key={l.line} className="flex items-center gap-3 px-4 py-2">
                  <Part l={l} />
                  {sent ? (
                    <span className="step-in mono shrink-0 whitespace-nowrap text-[11.5px]" style={T(si * 300 + i * 250 + 300)}>
                      <span className={late ? 'text-action-600' : 'text-strong-600'}>{duration(days)}</span>
                      {late && <span className="ml-1.5 text-[10px] text-action-600">after deadline</span>}
                    </span>
                  ) : (
                    <span className="mono shrink-0 text-[10.5px] text-ink-300">not asked</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
      {!sent && (
        <button onClick={onSend} className="rounded-[3px] bg-signal-700 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-signal-600">
          Approve and send {bySupplier.size} {bySupplier.size === 1 ? 'enquiry' : 'enquiries'}
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- approval */

export function ApprovalScreen({
  rfq, customer, contact, included, held, leadDays, deliveryDays, decision, onDecide,
}: {
  rfq: SimRfq; customer: string; contact: Contact; included: SimLine[]; held: SimLine[];
  leadDays: (l: SimLine) => number; deliveryDays: number | null;
  decision: 'approved' | 'returned' | null; onDecide: (d: 'approved' | 'returned') => void;
}) {
  const lateCount = rfq.deadlineDays === null ? 0 : included.filter((l) => leadDays(l) > rfq.deadlineDays!).length;
  const late = lateCount > 0;
  return (
    <div className="space-y-4">
      <section className="rounded-[4px] border border-ink-100 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <p className="mono text-[10.5px] tracking-[0.12em] text-ink-400">QUOTATION</p>
            <p className="mt-1 text-[15px] font-semibold text-ink-950">{customer}</p>
            <p className="text-[11px] text-ink-500">For the attention of {contact.email}</p>
          </div>
          <div className="text-right text-[11px] text-ink-500">
            <p className="mono text-ink-800">{rfq.reference.replace('RFQ', 'QT')}</p>
            <p>Against {rfq.reference}</p>
            <Pill tone={decision === 'approved' ? 'green' : 'amber'}>{decision === 'approved' ? 'Approved' : 'Awaiting sign-off'}</Pill>
          </div>
        </div>
        <table className="w-full table-fixed text-[11.5px]">
          <colgroup>
            <col className="w-[7.5rem]" />
            <col />
            <col className="w-20" />
            <col className="w-32" />
          </colgroup>
          <thead>
            <tr className="text-left text-[10px] text-ink-400">
              <th className="py-2 pl-5 font-normal">Part</th>
              <th className="font-normal">Description</th>
              <th className="px-3 text-right font-normal">Lead time</th>
              <th className="pr-5 text-right font-normal">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 border-t border-ink-100">
            {included.map((l) => {
              const over = rfq.deadlineDays !== null && leadDays(l) > rfq.deadlineDays;
              return (
                <tr key={l.line}>
                  <td className="mono py-2 pl-5 pr-3 text-signal-600">{l.partNumber}</td>
                  <td className="truncate text-ink-800">{l.name}</td>
                  <td className={`mono whitespace-nowrap px-3 text-right ${over ? 'text-action-600' : 'text-ink-700'}`}>{duration(leadDays(l), true)}</td>
                  <td className="whitespace-nowrap pr-5 text-right italic text-ink-400">set by Commercial</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-ink-100 px-5 py-3 text-[11.5px]">
          <span className="text-ink-500">Delivery position</span>
          <span className={`mono ${late ? 'text-action-600' : 'text-ink-900'}`}>
            {deliveryDays === null ? '—'
              : late ? `${lateCount} ${lateCount === 1 ? 'item' : 'items'} after the deadline · latest ${duration(deliveryDays)}`
              : `all items within ${duration(deliveryDays)}`}
            {rfq.deadlineDays ? ` · deadline ${duration(rfq.deadlineDays)}` : ''}
          </span>
        </div>
      </section>
      <p className="text-[11px] text-ink-500">
        {held.length > 0 && `${held.length} ${held.length === 1 ? 'line is' : 'lines are'} held back, pending the customer or removed on review. `}
        Prices are never generated: the catalogue publishes none, so Commercial sets them.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Choice active={decision === 'approved'} tone="go" onClick={() => onDecide('approved')}>Approve and send to the customer</Choice>
        <Choice active={decision === 'returned'} onClick={() => onDecide('returned')}>Send back to Engineering</Choice>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ order */

export const LATE_OPTIONS = ['Offer a phased delivery', 'Ask the supplier to expedite', 'Agree a new date with the customer'];

export function OrderScreen({
  rfq, included, leadDays, decision, onDecide,
}: {
  rfq: SimRfq; included: SimLine[]; leadDays: (l: SimLine) => number;
  decision: string | null; onDecide: (d: string) => void;
}) {
  const deadlineDays = rfq.deadlineDays;
  const longest = Math.max(...included.map(leadDays), deadlineDays ?? 0, 1);
  const scale = (d: number) => `${(d / longest) * 100}%`;
  const late = included.filter((l) => deadlineDays !== null && leadDays(l) > deadlineDays);
  const stages = ['Quote accepted', 'Purchase orders placed', 'In production', 'Shipped'];
  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[4px] border border-ink-100 bg-white px-4 py-3 text-[11.5px]">
        {stages.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-5 bg-ink-200" />}
            <span className={`h-2 w-2 rounded-full ${i < 3 ? 'bg-signal-600' : 'bg-ink-200'}`} />
            <span className={i < 3 ? 'text-ink-900' : 'text-ink-400'}>{s}</span>
          </span>
        ))}
      </section>

      <Panel title={`Order ${rfq.reference.replace('RFQ', 'SO')} · delivery tracking`} aside="simulated">
        <div className="relative px-4 pb-4 pt-7">
          {deadlineDays !== null && (
            <div className="pointer-events-none absolute bottom-3 top-3 z-10 border-l border-dashed border-action-600" style={{ left: `calc(1rem + 6.5rem + (100% - 2rem - 6.5rem) * ${deadlineDays / longest})` }}>
              <span className="mono absolute -top-0.5 -translate-x-1/2 whitespace-nowrap bg-white px-1 text-[9.5px] text-action-600">deadline</span>
            </div>
          )}
          <ul className="space-y-2">
            {included.map((l, i) => {
              const d = leadDays(l);
              const over = deadlineDays !== null && d > deadlineDays;
              return (
                <li key={l.line} className="flex items-center">
                  <span className="mono w-[6.5rem] shrink-0 text-[11px] text-signal-600">{l.partNumber}</span>
                  <div className="relative h-4 flex-1">
                    <div className={`step-in absolute inset-y-0 left-0 rounded-[1px] ${over ? 'bg-action-600' : 'bg-signal-600'}`} style={{ width: scale(d), ...T(i * 120) }} />
                    {d / longest > 0.4 ? (
                      <span className="mono absolute inset-y-0 left-1.5 flex items-center text-[9.5px] text-white">{duration(d, true)}</span>
                    ) : (
                      <span className="mono absolute inset-y-0 flex items-center pl-1.5 text-[9.5px] text-ink-600" style={{ left: scale(d) }}>{duration(d, true)}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Panel>

      {late.length === 0 ? (
        <p className="text-[12px] text-ink-600">Every item is due inside the deadline. The system tracks each order and flags any that slip.</p>
      ) : (
        <div>
          <p className="mb-2 text-[12px] text-ink-700">
            {late.length} {late.length === 1 ? 'item is' : 'items are'} due after the customer’s deadline. How should it be handled?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LATE_OPTIONS.map((o) => (
              <Choice key={o} active={decision === o} onClick={() => onDecide(o)}>{o}</Choice>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
