'use client';

import {
  AlertTriangle, BookOpen, Building2, Calendar, CheckCircle2, CircleDashed, Clock, CreditCard,
  Factory, FileText, History, Inbox, Mail, MapPin, MessageSquare, Phone, Plane, Plus, Send,
  ShieldCheck, Sparkles, Timer, Truck, UserPlus, Users, Wrench, XCircle, Zap, HelpCircle, ExternalLink, PoundSterling,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { aircraftLabel, duration, gbp, shortDate, supplierFor } from '@/lib/journey.ts';
import type { SimRfq, SimLine } from '@/lib/simulation/rfq.ts';
import type { CrmAccount, CrmInboxItem, CrmSupplier } from '@/lib/simulation/crm.ts';
import { MIN_MARGIN, gbpExact, marginOf, type LinePrice } from '@/lib/simulation/pricing.ts';
import { PageHeader } from '@/components/journey/frames.tsx';
import {
  Avatar, Badge, Button, Card, Fields, Stat, StagePath, Tabs, Td, Th, Thumb, type Tone,
} from '@/components/journey/ui.tsx';

export type Decision = 'approve' | 'remove' | 'query';
export interface Contact { email: string; company: string }

const T = (ms: number) => ({ animationDelay: `${ms}ms` });
const ENQUIRY_STAGES = ['New', 'Qualifying', 'Engineering', 'Procurement', 'Quote', 'Won'];
const has = (l: SimLine, kind: 'review' | 'supplier') => l.flags.some((f) => f.kind === kind);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const personOf = (email: string) => email.split('@')[0]!.replace(/[._-]+/g, ' ');

const JOB: Record<string, { tone: Tone; text: string }> = {
  won: { tone: 'green', text: 'Won' },
  lost: { tone: 'red', text: 'Lost' },
  quoted: { tone: 'blue', text: 'Quoted' },
  open: { tone: 'amber', text: 'Open' },
};

function PartCell({ l, sub }: { l: SimLine; sub?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Thumb src={l.image} size={32} />
      <div className="min-w-0">
        <p className="mono text-[11.5px] font-medium text-signal-700">{l.partNumber ?? '—'}</p>
        <p className="truncate text-[12px] text-ink-700">{l.name}</p>
        {sub}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">{children}</div>;
}

function Rail({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 space-y-4">{children}</div>;
}

/** Enquiry record header: shared by the new-enquiry and line-check pages. */
function EnquiryHeader({
  rfq, customer, owner, stage, tab, isNew,
}: { rfq: SimRfq; customer: string; owner: string; stage: number; tab: string; isNew?: boolean }) {
  return (
    <>
      <PageHeader
        crumbs={['Enquiries', 'Open', rfq.reference]}
        icon={Inbox}
        title={`${rfq.reference} · ${customer}`}
        badges={<>{isNew && <Badge tone="red" dot>New</Badge>}<Badge tone="violet">Website</Badge></>}
        meta={[
          <><Clock className="h-3.5 w-3.5" /> Received just now</>,
          <><Avatar name={owner} size={18} /> {owner}</>,
          ...(rfq.deadlineDays ? [<><Timer className="h-3.5 w-3.5" /> Needed within {duration(rfq.deadlineDays)}</>] : []),
        ]}
        actions={<><Button icon={Mail}>Reply</Button><Button icon={UserPlus}>Reassign</Button></>}
      />
      <div className="mb-4"><StagePath stages={ENQUIRY_STAGES} current={stage} /></div>
      <div className="mb-4">
        <Tabs active={tab} tabs={[{ label: 'Overview' }, { label: 'Lines', count: rfq.lines.length }, { label: 'Activity' }, { label: 'Files', count: 0 }]} />
      </div>
    </>
  );
}

/* -------------------------------------------------------------- 1 enquiry */

export function InboxScreen({
  rfq, contact, account, inbox, owner,
}: {
  rfq: SimRfq; contact: Contact; account: CrmAccount | null; inbox: CrmInboxItem[]; owner: string;
}) {
  const customer = account?.name ?? contact.company;
  const auto: Array<{ icon: LucideIcon; text: string }> = [
    { icon: FileText, text: `Enquiry ${rfq.reference} created from the website request` },
    account
      ? { icon: Building2, text: `Matched to the account ${account.name}` }
      : { icon: UserPlus, text: `No account for ${contact.company}; opened a new lead` },
    { icon: Users, text: account?.owner ? `Assigned to ${owner}, the account owner` : `Assigned to ${owner}, who takes new leads` },
    ...(rfq.deadlineDays ? [{ icon: Timer, text: `Deadline read from the message: ${rfq.deadlineDays} days` }] : []),
    { icon: Plane, text: `Aircraft and ${plural(rfq.lines.length, 'part')} recorded` },
    { icon: Mail, text: `Acknowledgement sent to ${contact.email} (simulated)` },
  ];
  return (
    <div>
      <EnquiryHeader rfq={rfq} customer={customer} owner={owner} stage={0} tab="Overview" isNew />
      <Grid>
        <div className="min-w-0 space-y-4">
          <Card title="Customer request" icon={MessageSquare} action="via Find a part">
            <div className="flex items-start gap-3">
              <Avatar name={personOf(contact.email)} size={30} />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px]">
                  <span className="font-medium text-ink-900">{contact.email}</span>
                  <span className="text-ink-400"> · {contact.company}</span>
                </p>
                <p className="mt-2 rounded-lg rounded-tl-none bg-ink-25 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-800 ring-1 ring-inset ring-ink-100">
                  {rfq.request}
                </p>
              </div>
            </div>
          </Card>
          <Card title="Requested parts" icon={Wrench} action={plural(rfq.lines.length, 'line')} pad={false}>
            <table className="w-full table-fixed">
              <thead><tr><Th>Part</Th><Th right className="w-14">Qty</Th><Th right className="w-32">Lead time</Th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {rfq.lines.map((l) => (
                  <tr key={l.line}>
                    <Td><PartCell l={l} /></Td>
                    <Td right className="text-ink-700">1</Td>
                    <Td right className="text-ink-700">{l.leadTimeDays !== null ? duration(l.leadTimeDays) : <span className="text-ink-400">Not published</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <Rail>
          <Card title="Details">
            <Fields rows={[
              ['Account', account ? <span className="font-medium text-signal-700">{account.name}</span> : <Badge tone="amber">New lead</Badge>],
              ['Contact', <span className="block truncate" title={contact.email}>{contact.email}</span>],
              ['Owner', <span className="flex items-center gap-1.5"><Avatar name={owner} size={18} />{owner}</span>],
              ['Source', 'Website · Find a part'],
              ['Aircraft', aircraftLabel(rfq.aircraft) ?? 'Not stated'],
              ['Needed within', rfq.deadlineDays ? duration(rfq.deadlineDays) : 'Not stated'],
            ]} />
          </Card>
          <Card title="Automation" icon={Zap} action="before anyone opened it">
            <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-ink-100">
              {auto.map(({ icon: Icon, text }, i) => (
                <li key={text} className="step-in relative flex gap-2.5" style={T(300 + i * 300)}>
                  <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e7f4ee] text-strong-600 ring-2 ring-white">
                    <Icon className="h-3 w-3" strokeWidth={2.2} />
                  </span>
                  <span className="pt-0.5 text-[12px] leading-snug text-ink-700">{text}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Also open" icon={Inbox} action={plural(inbox.length, 'enquiry', 'enquiries')} pad={false}>
            <ul className="divide-y divide-ink-100">
              {inbox.slice(0, 4).map((m) => (
                <li key={m.reference} className="flex items-center gap-2.5 px-4 py-2">
                  <Avatar name={m.customer} size={22} square />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-ink-800">{m.customer}</span>
                    <span className="block truncate text-[10.5px] text-ink-400">{m.reference} · {shortDate(m.date)}</span>
                  </span>
                  <Badge tone={m.status === 'Open' ? 'amber' : 'blue'}>{m.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </Rail>
      </Grid>
    </div>
  );
}

/* -------------------------------------------------------------- 2 account */

const BRIEF = ['Previous interactions', 'Previous quote', 'Technical position', 'Potential issue'];
const ACTIVITY: Record<string, LucideIcon> = { email: Mail, 'meeting-notes': Users, quote: FileText, 'account-history': History };

export function AccountScreen({
  account, contact, rfq, brief, owner,
}: { account: CrmAccount | null; contact: Contact; rfq: SimRfq; brief: any | null; owner: string }) {
  if (!account) return <NewLead contact={contact} rfq={rfq} owner={owner} />;

  const open = account.cases.filter((c) => c.status === 'Open');
  const openComplaint = open.some((c) => c.kind === 'Complaint');
  const health: { tone: Tone; text: string } = openComplaint
    ? { tone: 'red', text: 'Open complaint' }
    : open.length ? { tone: 'amber', text: plural(open.length, 'open case') }
    : { tone: 'green', text: 'No open cases' };
  const fields = brief ? BRIEF.map((l) => brief.fields.find((f: any) => f.label === l)).filter(Boolean) : [];
  const maxYear = Math.max(1, ...account.history.map((h) => h.enquiries));

  return (
    <div>
      <PageHeader
        crumbs={['Accounts', account.name]}
        logo={<Avatar name={account.name} size={40} square />}
        title={account.name}
        badges={<><Badge>{account.type}</Badge><Badge>{account.region}</Badge><Badge tone={health.tone} dot>{health.text}</Badge></>}
        meta={[
          <><MapPin className="h-3.5 w-3.5" />{account.country}</>,
          <><Calendar className="h-3.5 w-3.5" />Customer since {account.since.slice(0, 4)}</>,
          <><CreditCard className="h-3.5 w-3.5" />{account.paymentTerms} terms</>,
          ...(account.owner ? [<><Avatar name={account.owner.name} size={18} />{account.owner.name}</>] : []),
        ]}
        actions={<><Button icon={Phone}>Log call</Button><Button icon={Mail}>Email</Button><Button icon={Plus} variant="primary">New quote</Button></>}
      />
      <div className="mb-4">
        <Tabs active="Overview" tabs={[
          { label: 'Overview' }, { label: 'Enquiries', count: account.stats.enquiries + 1 },
          { label: 'Cases', count: account.cases.length }, { label: 'Contacts', count: 2 }, { label: 'Documents' },
        ]} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Annual spend" value={gbp(account.annualSpendGbp)} sub="indicative" />
        <Stat label="Won to date" value={account.stats.wonGbp ? gbp(account.stats.wonGbp) : '—'} sub={plural(account.stats.won, 'order')} />
        <Stat label="Win rate" value={account.stats.winRatePct === null ? '—' : `${account.stats.winRatePct}%`} sub={`${account.stats.won} of ${account.stats.decided} decided`} />
        <Stat label="Open quotes" value={account.stats.pipelineGbp ? gbp(account.stats.pipelineGbp) : '—'} sub="awaiting the customer" />
        <Stat label="Open cases" value={String(open.length)} sub={openComplaint ? 'includes a complaint' : open.length ? 'queries only' : 'none'} tone={openComplaint ? 'bad' : open.length ? undefined : 'good'} />
      </div>

      <Grid>
        <div className="min-w-0 space-y-4">
          <Card title="Enquiries per year" icon={History} action="figures show value won">
            <div className="flex h-32 items-end gap-3">
              {account.history.map((h, i) => (
                <div key={h.year} className="flex h-full flex-1 flex-col items-center gap-1.5">
                  <span className="h-3.5 text-[10.5px] text-ink-500">{h.wonGbp ? gbp(h.wonGbp) : ''}</span>
                  <div className="flex w-full max-w-11 flex-1 items-end">
                    <div className="step-in w-full rounded-t bg-signal-500/80" style={{ height: `${(h.enquiries / maxYear) * 100}%`, ...T(i * 80) }} />
                  </div>
                  <span className="text-[10.5px] text-ink-400">{h.year}</span>
                </div>
              ))}
              <div className="flex h-full flex-1 flex-col items-center gap-1.5">
                <span className="h-3.5 text-[10.5px] font-medium text-action-600">this one</span>
                <div className="flex w-full max-w-11 flex-1 items-end">
                  <div className="w-full rounded-t bg-action-500" style={{ height: `${(1 / maxYear) * 100}%` }} />
                </div>
                <span className="text-[10.5px] text-ink-400">Now</span>
              </div>
            </div>
          </Card>

          <Card title="Recent enquiries" icon={Inbox} pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Reference</Th><Th>Date</Th><Th>Aircraft · work</Th><Th>Status</Th><Th right>Value</Th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  <tr className="bg-signal-50/50">
                    <Td className="mono whitespace-nowrap font-medium text-signal-700">{rfq.reference}</Td>
                    <Td className="whitespace-nowrap text-ink-500">Today</Td>
                    <Td className="text-ink-800">{[aircraftLabel(rfq.aircraft), plural(rfq.lines.length, 'part')].filter(Boolean).join(' · ')}</Td>
                    <Td><Badge tone="red" dot>New</Badge></Td>
                    <Td right className="text-ink-400">—</Td>
                  </tr>
                  {account.jobs.map((j) => (
                    <tr key={j.reference} className="hover:bg-ink-25">
                      <Td className="mono whitespace-nowrap text-ink-600">{j.reference}</Td>
                      <Td className="whitespace-nowrap text-ink-500">{shortDate(j.date)}</Td>
                      <Td className="text-ink-800">{[j.aircraft, j.application?.toLowerCase()].filter(Boolean).join(' · ')}</Td>
                      <Td><Badge tone={JOB[j.status].tone} dot>{JOB[j.status].text}</Badge></Td>
                      <Td right className="mono whitespace-nowrap text-ink-800">{j.valueGbp ? gbp(j.valueGbp) : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Complaints and cases" icon={AlertTriangle} action={`${open.length} open`} pad={false}>
            {account.cases.length ? (
              <ul className="divide-y divide-ink-100">
                {account.cases.map((c) => {
                  const openC = c.status === 'Open';
                  const Icon = c.kind === 'Complaint' ? AlertTriangle : HelpCircle;
                  return (
                    <li key={c.id} className="flex gap-3 px-4 py-3">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${openC ? (c.kind === 'Complaint' ? 'bg-[#fdecec] text-action-600' : 'bg-[#fdf3e3] text-caution-600') : 'bg-ink-50 text-ink-400'}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-ink-900">{c.subject}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{c.detail}</p>
                        <p className="mt-1 text-[10.5px] text-ink-400">{c.id} · {c.kind} · opened {shortDate(c.opened)}</p>
                      </div>
                      <span className="shrink-0"><Badge tone={openC ? (c.kind === 'Complaint' ? 'red' : 'amber') : 'grey'} dot>{c.status}</Badge></span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-4 text-[12px] text-ink-500">No complaints or cases on record.</p>
            )}
          </Card>
        </div>

        <Rail>
          <section className="overflow-hidden rounded-lg border border-[#ddd5ff] bg-gradient-to-b from-[#f7f5ff] to-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <header className="flex items-center justify-between gap-2 border-b border-[#ebe5ff] px-4 py-2.5">
              <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-900">
                <Sparkles className="h-3.5 w-3.5 text-[#6d4fe0]" /> Before you reply
              </h3>
              <span className="text-[10.5px] text-ink-400">{brief ? `${brief.retrieval?.documents?.length ?? 0} documents read` : 'reading…'}</span>
            </header>
            {!brief ? (
              <div className="space-y-2 p-4">
                {[80, 95, 70].map((w) => <div key={w} className="h-2.5 animate-pulse rounded bg-[#ebe5ff]" style={{ width: `${w}%` }} />)}
              </div>
            ) : fields.length ? (
              <dl className="divide-y divide-[#f0ecff]">
                {fields.map((f: any, i: number) => (
                  <div key={f.label} className="step-in px-4 py-2.5" style={T(i * 140)}>
                    <dt className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-[#6d4fe0]">{f.label}</dt>
                    <dd className="mt-0.5 text-[12px] leading-snug text-ink-800">{f.value}</dd>
                    {f.citations?.[0] && (
                      <p className="mt-1 inline-flex max-w-full items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] text-ink-400 ring-1 ring-ink-100">
                        <FileText className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{f.citations[0].path}</span>
                      </p>
                    )}
                  </div>
                ))}
              </dl>
            ) : (
              <p className="p-4 text-[12px] text-ink-500">Little on file beyond the profile — itself worth knowing before replying.</p>
            )}
          </section>

          <Card title="Contacts" icon={Users} pad={false}>
            <ul className="divide-y divide-ink-100">
              <li className="flex items-center gap-2.5 px-4 py-2.5">
                <Avatar name={personOf(contact.email)} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink-900">{contact.email}</span>
                  <span className="block text-[10.5px] text-ink-400">Added from this enquiry</span>
                </span>
                <Badge tone="blue">New</Badge>
              </li>
              {account.owner && (
                <li className="flex items-center gap-2.5 px-4 py-2.5">
                  <Avatar name={account.owner.name} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink-900">{account.owner.name}</span>
                    <span className="block text-[10.5px] text-ink-400">Account owner · {account.owner.role}</span>
                  </span>
                </li>
              )}
            </ul>
          </Card>

          <Card title="Fleet" icon={Plane}>
            <div className="flex flex-wrap gap-1.5">{account.fleet.map((f) => <Badge key={f}>{f}</Badge>)}</div>
            <p className="mt-3 text-[11.5px] italic leading-snug text-ink-500">“{account.notes}”</p>
          </Card>

          <Card title="Recent activity" icon={History} pad={false}>
            <ul className="divide-y divide-ink-100">
              {account.activity.map((a) => {
                const Icon = ACTIVITY[a.kind] ?? FileText;
                return (
                  <li key={a.title + a.date} className="flex gap-2.5 px-4 py-2.5">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-[11.5px] text-ink-800">{a.title}</span>
                      <span className="block text-[10.5px] text-ink-400">{shortDate(a.date)}{a.author ? ` · ${a.author}` : ''}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Rail>
      </Grid>
    </div>
  );
}

function NewLead({ contact, rfq, owner }: { contact: Contact; rfq: SimRfq; owner: string }) {
  return (
    <div>
      <PageHeader
        crumbs={['Accounts', 'Leads', contact.company]}
        logo={<Avatar name={contact.company} size={40} square />}
        title={contact.company}
        badges={<Badge tone="amber" dot>New lead</Badge>}
        meta={[<><Avatar name={owner} size={18} />{owner}</>, <><Mail className="h-3.5 w-3.5" />{contact.email}</>]}
        actions={<><Button icon={Phone}>Log call</Button><Button icon={Building2} variant="primary">Convert to account</Button></>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Won to date" value="—" sub="no orders" />
        <Stat label="Enquiries" value="1" sub="this one" />
        <Stat label="Open cases" value="0" sub="none" />
        <Stat label="Contacts" value="1" sub="from this enquiry" />
      </div>
      <Grid>
        <Card title="No history on record" icon={CircleDashed}>
          <p className="text-[12.5px] leading-relaxed text-ink-600">
            The system searched the CRM for this company and for similar names and found none, so it opened
            a new lead instead of matching an account. There are no previous enquiries, orders, cases or
            correspondence to read. A salesperson would normally call to qualify it.
          </p>
          <div className="mt-4 rounded-lg bg-ink-25 px-3.5 py-3 text-[12px] text-ink-600 ring-1 ring-inset ring-ink-100">
            <span className="mono font-medium text-signal-700">{rfq.reference}</span> · {plural(rfq.lines.length, 'part')} · received just now
          </div>
        </Card>
        <Card title="Contacts" icon={Users}>
          <p className="break-all text-[12px] font-medium text-ink-900">{contact.email}</p>
          <p className="text-[10.5px] text-ink-400">Added from this enquiry</p>
        </Card>
      </Grid>
    </div>
  );
}

/* ---------------------------------------------------------------- 3 check */

export function CheckScreen({ rfq, customer, owner }: { rfq: SimRfq; customer: string; owner: string }) {
  const ready = rfq.lines.filter((l) => !l.flags.length).length;
  const toEng = rfq.lines.filter((l) => has(l, 'review')).length;
  const toProc = rfq.lines.filter((l) => has(l, 'supplier')).length;
  return (
    <div>
      <EnquiryHeader rfq={rfq} customer={customer} owner={owner} stage={1} tab="Lines" />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Ready to quote" value={String(ready)} sub="nothing to check" tone={ready ? 'good' : undefined} />
        <Stat label="To Engineering" value={String(toEng)} sub="applicability to confirm" />
        <Stat label="To Procurement" value={String(toProc)} sub="lead time to confirm" />
      </div>
      <Card title="Line check" icon={CheckCircle2} action="against each catalogue record" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed">
            <thead>
              <tr><Th className="w-10">#</Th><Th>Part</Th><Th className="w-36">Applicability</Th><Th className="w-32">Lead time</Th><Th className="w-52">Routed to</Th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rfq.lines.map((l, i) => {
                const reasons = l.flags.map((f) => f.reason);
                const over = rfq.deadlineDays !== null && l.leadTimeDays !== null && l.leadTimeDays > rfq.deadlineDays;
                return (
                  <tr key={l.line} className="step-in align-top" style={T(i * 120)}>
                    <Td className="mono pt-3.5 text-[11px] text-ink-400">{String(l.line).padStart(2, '0')}</Td>
                    <Td>
                      <PartCell l={l} sub={reasons.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {reasons.map((r) => <li key={r} className="whitespace-normal text-[11px] leading-snug text-ink-500">{r}</li>)}
                        </ul>
                      )} />
                    </Td>
                    <Td className="pt-3.5">
                      {has(l, 'review')
                        ? <span className="flex items-center gap-1.5 text-[12px] text-caution-600"><AlertTriangle className="h-3.5 w-3.5" />Not established</span>
                        : <span className="flex items-center gap-1.5 text-[12px] text-strong-600"><CheckCircle2 className="h-3.5 w-3.5" />Confirmed</span>}
                    </Td>
                    <Td className="pt-3.5">
                      {l.leadTimeDays === null
                        ? <span className="flex items-center gap-1.5 text-[12px] text-caution-600"><AlertTriangle className="h-3.5 w-3.5" />Not published</span>
                        : <span className={`flex items-center gap-1.5 text-[12px] ${over ? 'text-action-600' : 'text-strong-600'}`}>
                            {over ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{duration(l.leadTimeDays)}
                          </span>}
                    </Td>
                    <Td className="pt-3.5">
                      <span className="flex flex-wrap gap-1">
                        {!l.flags.length && <Badge tone="green">Ready</Badge>}
                        {has(l, 'review') && <Badge tone="amber">Engineering</Badge>}
                        {has(l, 'supplier') && <Badge tone="blue">Procurement</Badge>}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- 4 review */

function Segmented({ value, onChange }: { value?: Decision; onChange: (d: Decision) => void }) {
  const opts: Array<{ d: Decision; label: string; icon: LucideIcon; on: string }> = [
    { d: 'approve', label: 'Approve', icon: CheckCircle2, on: 'bg-strong-600 text-white' },
    { d: 'query', label: 'Ask customer', icon: MessageSquare, on: 'bg-signal-600 text-white' },
    { d: 'remove', label: 'Remove', icon: XCircle, on: 'bg-action-600 text-white' },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-inset ring-ink-200">
      {opts.map(({ d, label, icon: Icon, on }, i) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`inline-flex h-8 items-center gap-1.5 px-3 text-[12px] font-medium transition-colors ${i > 0 ? 'border-l border-ink-200' : ''} ${
            value === d ? on : 'text-ink-600 hover:bg-ink-25'
          }`}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}

const DECIDED: Record<Decision, { tone: Tone; text: string }> = {
  approve: { tone: 'green', text: 'Approved' },
  query: { tone: 'blue', text: 'Query to customer' },
  remove: { tone: 'red', text: 'Removed' },
};

export function ReviewScreen({
  rfq, customer, lines, decisions, onDecide, brief,
}: {
  rfq: SimRfq; customer: string; lines: SimLine[]; decisions: Record<number, Decision>;
  onDecide: (line: number, d: Decision) => void; brief: any | null;
}) {
  const pending = lines.filter((l) => !decisions[l.line]);
  const guidance = brief?.fields?.find((f: any) => f.label === 'Technical position');
  const checksOf = (l: SimLine) => l.flags.flatMap((f) => (f.kind === 'review' && f.check ? [f.check] : []));

  // One row per kind of question, so the engineer sees the shape of the queue first.
  const topics = new Map<string, { count: number; asked: string; catalogue: string; question: string }>();
  for (const l of lines) {
    for (const c of checksOf(l)) {
      const t = topics.get(c.topic);
      if (t) t.count += 1;
      else topics.set(c.topic, { count: 1, asked: c.asked, catalogue: c.catalogue, question: c.question });
    }
  }

  return (
    <div>
      <PageHeader
        crumbs={['Engineering', 'Review queue', rfq.reference]}
        icon={Wrench}
        title="Technical review"
        badges={lines.length ? (pending.length ? <Badge tone="amber" dot>{pending.length} awaiting you</Badge> : <Badge tone="green" dot>Complete</Badge>) : undefined}
        meta={[
          <><Inbox className="h-3.5 w-3.5" />{rfq.reference}</>,
          <><Building2 className="h-3.5 w-3.5" />{customer}</>,
          <><Plane className="h-3.5 w-3.5" />{aircraftLabel(rfq.aircraft) ?? 'Aircraft not stated'}{rfq.variant ? ` (-${rfq.variant} stated)` : ''}{rfq.engine ? ` · ${rfq.engine}` : ''}</>,
          ...(rfq.deadlineDays ? [<><Timer className="h-3.5 w-3.5" />Needed within {duration(rfq.deadlineDays)}</>] : []),
        ]}
        actions={pending.length > 0 && pending.length < lines.length
          ? <Button icon={CheckCircle2} variant="success" onClick={() => pending.forEach((l) => onDecide(l.line, 'approve'))}>Approve remaining {pending.length}</Button>
          : undefined}
      />

      {topics.size > 0 && (
        <section className="mb-4 overflow-hidden rounded-lg border border-caution-500/30 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex items-center gap-2 border-b border-caution-500/20 bg-[#fdf6ea] px-4 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-caution-600" />
            <h3 className="text-[12.5px] font-semibold text-ink-900">What needs Engineering</h3>
            <span className="ml-auto text-[11px] text-ink-500">{plural(lines.length, 'line')} of {rfq.lines.length} on this enquiry</span>
          </header>
          <ul className="divide-y divide-ink-100">
            {[...topics.entries()].map(([topic, t]) => (
              <li key={topic} className="grid gap-3 px-4 py-3 md:grid-cols-[140px_1fr_1fr_1.2fr] md:items-center">
                <span>
                  <span className="block text-[12.5px] font-semibold text-ink-900">{topic}</span>
                  <span className="block text-[11px] text-ink-500">{plural(t.count, 'line')}</span>
                </span>
                <Compare label="Customer asked for" value={t.asked} />
                <Compare label="Catalogue records" value={t.catalogue} muted />
                <p className="flex items-start gap-2 text-[12.5px] font-medium leading-snug text-ink-900">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-caution-600" />{t.question}
                </p>
              </li>
            ))}
          </ul>
          {guidance && (
            <div className="flex items-start gap-2.5 border-t border-ink-100 bg-ink-25/70 px-4 py-3">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
              <p className="text-[11.5px] leading-relaxed text-ink-600">
                <span className="font-semibold text-ink-800">Engineering guidance · </span>{guidance.value}
                {guidance.citations?.[0] && <span className="ml-1.5 whitespace-nowrap text-[10.5px] text-ink-400">— {guidance.citations[0].path}</span>}
              </p>
            </div>
          )}
        </section>
      )}

      <div className="space-y-3">
        {!lines.length && (
          <Card><p className="text-[12.5px] text-ink-600">Nothing in the queue: every line establishes what the customer asked for.</p></Card>
        )}
        {lines.map((l) => {
          const d = decisions[l.line];
          const checks = checksOf(l);
          return (
            <section key={l.line} className={`overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${d ? 'border-ink-100' : 'border-caution-500/40'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <Thumb src={l.image} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="mono text-[11.5px] font-medium text-signal-700">{l.partNumber}</p>
                  <p className="truncate text-[13px] font-medium text-ink-900">{l.name}</p>
                </div>
                {d ? <Badge tone={DECIDED[d].tone} dot>{DECIDED[d].text}</Badge> : <Badge tone="amber" dot>Pending</Badge>}
              </div>

              <div className="border-t border-ink-100 px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-caution-600">To confirm</p>
                <div className="space-y-2">
                  {checks.map((c) => (
                    <div key={c.topic} className="grid gap-2 md:grid-cols-[1fr_1fr_1.3fr] md:items-center">
                      <Compare label={`${c.topic} · asked for`} value={c.asked} />
                      <Compare label="Catalogue record" value={c.catalogue} muted />
                      <p className="flex items-start gap-2 text-[12.5px] font-medium leading-snug text-ink-900">
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-caution-600" />{c.question}
                      </p>
                    </div>
                  ))}
                  {!checks.length && l.flags.filter((f) => f.kind === 'review').map((f) => (
                    <p key={f.reason} className="text-[12px] text-ink-700">{f.reason}</p>
                  ))}
                </div>
              </div>

              <div className="border-t border-ink-100 bg-ink-25/60 px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">From the catalogue record</p>
                  <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-[11px] font-medium text-signal-600 hover:text-signal-800">
                    Catalogue page <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {l.specs.length ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
                    {l.specs.map((sp) => (
                      <div key={sp.label} className="min-w-0">
                        <dt className="text-[10.5px] text-ink-400">{sp.label}</dt>
                        <dd className="text-[12px] leading-snug text-ink-800">{sp.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="text-[11.5px] text-ink-400">No specification published.</p>}
                {l.summary && <p className="mt-2 text-[11.5px] leading-snug text-ink-500">{l.summary}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 px-4 py-3">
                <Segmented value={d} onChange={(v) => onDecide(l.line, v)} />
                <span className="text-[11px] text-ink-400">Approve puts it on the quote · Ask holds it for the customer · Remove drops it</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Compare({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`min-w-0 rounded-md px-2.5 py-1.5 ring-1 ring-inset ${muted ? 'bg-ink-25 ring-ink-100' : 'bg-signal-50/60 ring-signal-600/10'}`}>
      <p className="text-[10px] text-ink-400">{label}</p>
      <p className={`text-[12px] font-medium leading-snug ${muted ? 'text-ink-700' : 'text-signal-800'}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------- 5 supplier */

export function SupplierScreen({
  rfq, lines, sent, onSend, replies, suppliers,
}: {
  rfq: SimRfq; lines: SimLine[]; sent: boolean; onSend: () => void;
  replies: Record<number, number>; suppliers: CrmSupplier[];
}) {
  const bySupplier = new Map<string, SimLine[]>();
  for (const l of lines) {
    const s = supplierFor(l.name);
    bySupplier.set(s, [...(bySupplier.get(s) ?? []), l]);
  }
  const deadline = rfq.deadlineDays;
  return (
    <div>
      <PageHeader
        crumbs={['Procurement', 'Lead-time requests', rfq.reference]}
        icon={Truck}
        title="Lead-time requests"
        badges={lines.length ? (sent ? <Badge tone="green" dot>Sent · replies in</Badge> : <Badge tone="amber" dot>{plural(bySupplier.size, 'draft')}</Badge>) : undefined}
        meta={[<><Inbox className="h-3.5 w-3.5" />{rfq.reference}</>, ...(deadline ? [<><Timer className="h-3.5 w-3.5" />Customer needs within {duration(deadline)}</>] : [])]}
        actions={lines.length && !sent ? <Button icon={Send} variant="primary" size="md" onClick={onSend}>Approve and send {plural(bySupplier.size, 'request')}</Button> : undefined}
      />
      {!lines.length && <Card><p className="text-[12.5px] text-ink-600">Nothing to ask: every line has a published lead time inside the deadline.</p></Card>}
      <div className="space-y-4">
        {[...bySupplier.entries()].map(([name, ls], si) => {
          const s = suppliers.find((x) => x.name === name);
          return (
            <section key={name} className="overflow-hidden rounded-lg border border-ink-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <header className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-4 py-3">
                <Avatar name={name} size={34} square />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-900">{name}</p>
                  {s && <p className="text-[11px] text-ink-400">{s.category} · {s.country}</p>}
                </div>
                {s && (
                  <div className="flex gap-5 text-right">
                    <span><span className="block text-[10.5px] text-ink-400">On time</span><span className="block text-[12.5px] font-semibold text-ink-900">{s.reliabilityPct}%</span></span>
                    <span><span className="block text-[10.5px] text-ink-400">Usual lead time</span><span className="block text-[12.5px] font-semibold text-ink-900">{s.standardLeadTimeWeeks} wks</span></span>
                  </div>
                )}
                {sent ? <Badge tone="green" dot>Replied</Badge> : <Badge dot>Draft</Badge>}
              </header>
              {!sent && (
                <div className="border-b border-ink-100 bg-ink-25 px-4 py-3 text-[12px]">
                  <p className="text-ink-400">Subject <span className="ml-2 font-medium text-ink-800">Lead time request — {rfq.reference}</span></p>
                  <p className="mt-2 leading-relaxed text-ink-700">
                    Please confirm your current lead time for the items below, for delivery to Field. We are quoting a
                    customer who needs them within {deadline ? `${deadline} days` : 'a stated window'}.
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-ink-400"><Sparkles className="h-3 w-3 text-[#6d4fe0]" />Drafted by the system · not sent</p>
                </div>
              )}
              <table className="w-full table-fixed">
                <thead><tr><Th>Item</Th><Th right className="w-32">Catalogue</Th><Th right className="w-52">Supplier reply</Th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {ls.map((l, i) => {
                    const days = replies[l.line];
                    const late = deadline !== null && days > deadline;
                    return (
                      <tr key={l.line}>
                        <Td><PartCell l={l} /></Td>
                        <Td right className="text-[12px] text-ink-500">{l.leadTimeDays !== null ? duration(l.leadTimeDays) : 'Not published'}</Td>
                        <Td right>
                          {sent ? (
                            <span className="step-in inline-flex items-center gap-2" style={T(si * 300 + i * 250 + 200)}>
                              <span className="mono whitespace-nowrap text-[12px] font-medium text-ink-900">{duration(days)}</span>
                              <Badge tone={late ? 'red' : 'green'}>{late ? 'After deadline' : 'In time'}</Badge>
                            </span>
                          ) : <span className="text-[12px] text-ink-300">Not asked</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
        {sent && lines.length > 0 && <p className="text-[11px] text-ink-400">Supplier replies are simulated.</p>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 6 pricing */

/** Unmissable: these numbers are invented. Shown wherever a price appears. */
export function SyntheticPrices({ compact }: { compact?: boolean }) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-4 py-3 ring-1 ring-inset ring-[#6d4fe0]/30"
      style={{ background: 'repeating-linear-gradient(135deg, #f5f2ff 0 10px, #efe9ff 10px 20px)' }}
    >
      <span className="mt-0.5 rounded bg-[#5b3fc4] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-white">SYNTHETIC</span>
      <p className="text-[12px] leading-snug text-[#3b2a85]">
        <span className="font-semibold">These are not Field’s prices.</span>{' '}
        {compact
          ? 'Every price, cost and margin here is invented for the demo.'
          : 'Field publishes no prices, so every cost, freight rate, margin rule, customer discount and past price on this screen is invented for the demo. It shows how pricing would work, not what Field charges.'}
      </p>
    </div>
  );
}

function Synth() {
  return <span className="ml-1 rounded bg-[#efe9ff] px-1 text-[9px] font-bold tracking-[0.08em] text-[#5b3fc4]">SYNTHETIC</span>;
}

export function PricingScreen({
  rfq, customer, account, lines, prices, chosen, onPrice, confirmed, onConfirm,
}: {
  rfq: SimRfq; customer: string; account: CrmAccount | null; lines: SimLine[];
  prices: LinePrice[]; chosen: Record<number, number>; onPrice: (line: number, price: number) => void;
  confirmed: boolean; onConfirm: () => void;
}) {
  const priceOf = (p: LinePrice) => chosen[p.line] ?? p.suggested;
  const total = prices.reduce((a, p) => a + priceOf(p), 0);
  const landed = prices.reduce((a, p) => a + p.landed, 0);
  const blended = marginOf(total, landed);
  const discount = prices[0]?.discountPct ?? 0;
  const priceCase = account?.cases.find((c) => c.status === 'Open' && /price/i.test(c.subject));
  const sensitive = /price/i.test(account?.notes ?? '');
  const lineOf = (n: number) => lines.find((l) => l.line === n)!;

  return (
    <div>
      <PageHeader
        crumbs={['Quotes', rfq.reference.replace('RFQ', 'QT'), 'Pricing']}
        icon={PoundSterling}
        title="Price the quote"
        badges={<><span className="rounded-md bg-[#5b3fc4] px-1.5 py-0.5 text-[10.5px] font-bold tracking-[0.08em] text-white">SYNTHETIC PRICES</span>{confirmed ? <Badge tone="green" dot>Prices set</Badge> : <Badge tone="amber" dot>Awaiting you</Badge>}</>}
        meta={[
          <><Building2 className="h-3.5 w-3.5" />{customer}</>,
          <><CreditCard className="h-3.5 w-3.5" />{discount ? `${discount}% account discount` : 'No account discount'}</>,
          <>{plural(prices.length, 'line')}</>,
        ]}
        actions={<Button icon={CheckCircle2} variant={confirmed ? 'success' : 'primary'} size="md" onClick={onConfirm}>{confirmed ? 'Prices confirmed' : 'Confirm prices'}</Button>}
      />

      <div className="mb-4"><SyntheticPrices /></div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Quote total" value={gbpExact(total)} sub="synthetic" />
        <Stat label="Landed cost" value={gbpExact(landed)} sub="supplier cost + freight" />
        <Stat label="Margin" value={`${(blended * 100).toFixed(1)}%`} sub={blended < MIN_MARGIN ? 'below the 20% minimum' : 'above the 20% minimum'} tone={blended < MIN_MARGIN ? 'bad' : 'good'} />
        <Stat label="Sold before" value={`${prices.filter((p) => p.last).length} of ${prices.length}`} sub="lines with a past price" />
      </div>

      {(priceCase || sensitive) && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-action-600/20 bg-[#fdf3f3] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-action-600" />
          <p className="text-[12.5px] leading-snug text-ink-700">
            <span className="font-semibold text-ink-900">Price-sensitive account. </span>
            {priceCase ? `Open complaint ${priceCase.id}: “${priceCase.subject}”. ` : ''}
            {sensitive ? `The account notes say: “${account!.notes}” ` : ''}
            Check any line priced above what they paid before.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {prices.map((p) => {
          const l = lineOf(p.line);
          const price = priceOf(p);
          const m = marginOf(price, p.landed);
          const vsLast = p.last ? (price - p.last.price) / p.last.price : null;
          const warnings = [
            ...(m < MIN_MARGIN ? [{ tone: 'red', text: `Margin ${(m * 100).toFixed(1)}% is below the 20% minimum.` }] : []),
            ...(vsLast !== null && vsLast > 0.05 ? [{ tone: 'amber', text: `${(vsLast * 100).toFixed(0)}% above the ${gbpExact(p.last!.price)} this customer paid in ${shortDate(p.last!.date).replace(/^1 /, '')}. Be ready to explain the difference.` }] : []),
          ];
          return (
            <section key={p.line} className="overflow-hidden rounded-lg border border-ink-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex items-center gap-3 px-4 py-3">
                <Thumb src={l.image} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="mono text-[11.5px] font-medium text-signal-700">{l.partNumber}</p>
                  <p className="truncate text-[12.5px] font-medium text-ink-900">{l.name}</p>
                </div>
                <span className="text-right">
                  <span className="block text-[10.5px] text-ink-400">Supplier</span>
                  <span className="block text-[11.5px] text-ink-700">{supplierFor(l.name)}</span>
                </span>
              </div>
              <div className="grid gap-px border-t border-ink-100 bg-ink-100 md:grid-cols-[1fr_1.15fr_1fr]">
                <div className="bg-white p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">How the price is built<Synth /></p>
                  <dl className="space-y-1 text-[12px]">
                    <Row k="Supplier cost" v={gbpExact(p.cost)} />
                    <Row k={`Freight and duty`} v={`+${p.freightPct}%`} />
                    <Row k={`Margin · ${p.rule.label}`} v={`${p.rule.marginPct}%`} />
                    <Row k="Account discount" v={p.discountPct ? `−${p.discountPct}%` : 'none'} />
                    <div className="flex justify-between border-t border-ink-100 pt-1.5 font-semibold text-ink-900">
                      <dt>Suggested</dt><dd className="mono">{gbpExact(p.suggested)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="bg-white p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">Price history<Synth /></p>
                  <dl className="space-y-1 text-[12px]">
                    <Row k={p.last ? `They paid · ${shortDate(p.last.date).replace(/^1 /, '')}` : 'They paid'} v={p.last ? gbpExact(p.last.price) : 'never bought'} />
                    <Row k="Others pay" v={gbpExact(p.typical)} />
                    <Row k="Range" v={`${gbpExact(p.low)}–${gbpExact(p.high)}`} />
                  </dl>
                </div>
                <div className="bg-ink-25/60 p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-caution-600">Your price</p>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 flex-1 items-center rounded-lg bg-white px-2.5 ring-1 ring-inset ring-ink-200 focus-within:ring-2 focus-within:ring-signal-500">
                      <span className="text-[13px] text-ink-400">£</span>
                      <input
                        type="number"
                        min={0}
                        step={5}
                        value={price}
                        onChange={(e) => onPrice(p.line, Math.max(0, Number(e.target.value) || 0))}
                        aria-label={`Price for ${l.partNumber}`}
                        className="mono w-full bg-transparent px-1 text-[13px] font-medium text-ink-950 outline-none"
                      />
                    </span>
                    <Badge tone={m < MIN_MARGIN ? 'red' : 'green'}>{(m * 100).toFixed(1)}%</Badge>
                  </div>
                  {price !== p.suggested && (
                    <button onClick={() => onPrice(p.line, p.suggested)} className="mt-1.5 text-[11px] font-medium text-signal-600 hover:text-signal-800">
                      Reset to suggested {gbpExact(p.suggested)}
                    </button>
                  )}
                  <ul className="mt-2 space-y-1.5">
                    {warnings.map((w) => (
                      <li key={w.text} className={`flex items-start gap-1.5 text-[11.5px] leading-snug ${w.tone === 'red' ? 'text-action-600' : 'text-caution-600'}`}>
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{w.text}
                      </li>
                    ))}
                    {!warnings.length && <li className="flex items-center gap-1.5 text-[11.5px] text-strong-600"><CheckCircle2 className="h-3 w-3" />Nothing unusual</li>}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="min-w-0 truncate text-ink-500">{k}</dt>
      <dd className="mono shrink-0 whitespace-nowrap text-right text-ink-800">{v}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- 7 approval */

export function ApprovalScreen({
  rfq, customer, contact, included, held, leadDays, deliveryDays, decision, onDecide, reviewed, supplierAsked, approver,
  prices, margin, pricedBy, belowMin,
}: {
  rfq: SimRfq; customer: string; contact: Contact; included: SimLine[]; held: SimLine[];
  leadDays: (l: SimLine) => number; deliveryDays: number | null;
  decision: 'approved' | 'returned' | null; onDecide: (d: 'approved' | 'returned') => void;
  reviewed: number; supplierAsked: number; approver: string;
  prices: Record<number, number>; margin: number; pricedBy: string; belowMin: number;
}) {
  const total = included.reduce((a, l) => a + (prices[l.line] ?? 0), 0);
  const lateCount = rfq.deadlineDays === null ? 0 : included.filter((l) => leadDays(l) > rfq.deadlineDays!).length;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const qt = rfq.reference.replace('RFQ', 'QT');
  const checks: Array<{ ok: boolean; label: string; detail: string }> = [
    { ok: true, label: 'Engineering review', detail: reviewed ? `${plural(reviewed, 'line')} decided${held.length ? `, ${held.length} held back` : ''}` : 'not needed' },
    { ok: true, label: 'Supplier lead times', detail: supplierAsked ? `${supplierAsked} confirmed` : 'all published' },
    { ok: !lateCount, label: 'Delivery against deadline', detail: lateCount ? `${plural(lateCount, 'item')} late` : 'all in time' },
    { ok: margin >= MIN_MARGIN && !belowMin, label: 'Pricing', detail: `${gbpExact(total)} at ${(margin * 100).toFixed(1)}% margin${belowMin ? ` · ${plural(belowMin, 'line')} below the 20% minimum` : ''} · set by ${pricedBy} · synthetic` },
  ];
  return (
    <div>
      <PageHeader
        crumbs={['Quotes', qt]}
        icon={FileText}
        title={qt}
        badges={decision === 'approved' ? <Badge tone="green" dot>Approved</Badge> : <Badge tone="amber" dot>Awaiting approval</Badge>}
        meta={[<><Building2 className="h-3.5 w-3.5" />{customer}</>, <><Inbox className="h-3.5 w-3.5" />From {rfq.reference}</>, <>{plural(included.length, 'line')}</>]}
      />
      <div className="mb-4"><StagePath stages={ENQUIRY_STAGES} current={4} /></div>
      <Grid>
        <div className="min-w-0 space-y-3">
        <SyntheticPrices compact />
        <div className="relative min-w-0 overflow-hidden rounded-md bg-white p-6 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_12px_32px_-16px_rgba(16,24,40,0.25)] ring-1 ring-ink-100 sm:p-8">
          <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] whitespace-nowrap text-[54px] font-black tracking-[0.12em] text-[#5b3fc4]/[0.07]">
            SYNTHETIC PRICES
          </span>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-signal-700 pb-4">
            <span className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded bg-signal-700"><span className="h-2.5 w-2.5 rotate-45 bg-white" /></span>
              <span className="leading-none">
                <span className="block text-[15px] font-semibold text-signal-900">Field</span>
                <span className="block text-[8.5px] tracking-[0.18em] text-ink-400">INTERNATIONAL</span>
              </span>
            </span>
            <span className="text-right">
              <span className="block text-[18px] font-light tracking-[0.12em] text-ink-900">QUOTATION</span>
              <span className="mono block text-[11px] text-ink-500">{qt} · {today}</span>
            </span>
          </div>
          <div className="mt-4 grid gap-4 text-[11.5px] sm:grid-cols-2">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">Prepared for</p><p className="mt-1 font-medium text-ink-900">{customer}</p><p className="break-all text-ink-500">{contact.email}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">Your reference</p><p className="mono mt-1 text-ink-900">{rfq.reference}</p><p className="text-ink-500">{aircraftLabel(rfq.aircraft) ?? ''}{rfq.engine ? ` · ${rfq.engine}` : ''}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-5 w-full min-w-[400px] table-fixed text-[11.5px]">
              <thead>
                <tr className="border-y border-ink-200 text-left text-[10px] uppercase tracking-[0.06em] text-ink-500">
                  <th className="w-6 py-2 font-semibold">#</th><th className="w-24 font-semibold">Part</th><th className="font-semibold">Description</th>
                  <th className="w-9 text-right font-semibold">Qty</th><th className="w-[4.5rem] text-right font-semibold">Lead time</th><th className="w-24 text-right font-semibold">Unit price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {included.map((l, i) => {
                  const over = rfq.deadlineDays !== null && leadDays(l) > rfq.deadlineDays;
                  return (
                    <tr key={l.line}>
                      <td className="py-2 text-ink-400">{i + 1}</td>
                      <td className="mono text-signal-700">{l.partNumber}</td>
                      <td className="truncate pr-2 text-ink-800">{l.name}</td>
                      <td className="text-right text-ink-700">1</td>
                      <td className={`text-right ${over ? 'font-medium text-action-600' : 'text-ink-700'}`}>{duration(leadDays(l), true)}</td>
                      <td className="mono whitespace-nowrap text-right text-ink-900">{gbpExact(prices[l.line] ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-ink-200 pt-3 text-[11.5px]">
            <span className="text-ink-500">Delivery: {deliveryDays !== null ? `all items within ${duration(deliveryDays)}` : '—'}{rfq.deadlineDays ? ` (requested ${duration(rfq.deadlineDays)})` : ''}</span>
            <span className="font-semibold text-ink-950">Total {gbpExact(total)} <span className="text-[10px] font-bold tracking-[0.08em] text-[#5b3fc4]">SYNTHETIC</span></span>
          </div>
          <p className="mt-4 text-[10.5px] leading-relaxed text-ink-400">
            {held.length > 0 && `${plural(held.length, 'line')} not included pending confirmation. `}
            Prices are synthetic: Field publishes none, so these were invented for the demo and set in the pricing step.
          </p>
        </div>
        </div>

        <Rail>
          <Card title="Approval" icon={ShieldCheck}>
            <div className="flex items-center gap-2.5">
              <Avatar name={approver} size={30} you />
              <span className="leading-tight">
                <span className="block text-[12.5px] font-medium text-ink-900">{approver}</span>
                <span className="block text-[11px] text-ink-400">{decision === 'approved' ? 'Approved' : 'Your approval is required'}</span>
              </span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5">
                  {c.ok
                    ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-strong-600" />
                    : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-caution-500" />}
                  <span className="leading-tight">
                    <span className="block text-[12px] font-medium text-ink-900">{c.label}</span>
                    <span className="block text-[11px] text-ink-500">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => onDecide('approved')}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-strong-600 text-[12.5px] font-medium text-white transition-colors hover:bg-strong-500"
              >
                <CheckCircle2 className="h-4 w-4" /> {decision === 'approved' ? 'Approved and sent' : 'Approve and send'}
              </button>
              <button
                onClick={() => onDecide('returned')}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-white text-[12.5px] font-medium text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-25"
              >
                <Wrench className="h-4 w-4" /> Return to Engineering
              </button>
            </div>
          </Card>
        </Rail>
      </Grid>
    </div>
  );
}

/* ---------------------------------------------------------------- 8 order */

export const LATE_OPTIONS = ['Offer a phased delivery', 'Ask the supplier to expedite', 'Agree a new date with the customer'];
const LATE_DETAIL: Record<string, string> = {
  'Offer a phased delivery': 'Ship what’s ready by the deadline; the rest follows.',
  'Ask the supplier to expedite': 'Procurement asks for an earlier date, possibly at a cost.',
  'Agree a new date with the customer': 'The account owner contacts the customer.',
};

export function OrderScreen({
  rfq, customer, included, leadDays, decision, onDecide,
}: {
  rfq: SimRfq; customer: string; included: SimLine[]; leadDays: (l: SimLine) => number;
  decision: string | null; onDecide: (d: string) => void;
}) {
  const deadline = rfq.deadlineDays;
  const longestDays = Math.max(...included.map(leadDays), deadline ?? 0, 7);
  const totalWeeks = Math.max(2, Math.ceil(longestDays / 7 / 2) * 2);
  const span = totalWeeks * 7;
  const pct = (d: number) => `${(d / span) * 100}%`;
  const ticks = Array.from({ length: totalWeeks / 2 + 1 }, (_, i) => i * 2);
  const late = included.filter((l) => deadline !== null && leadDays(l) > deadline);
  const so = rfq.reference.replace('RFQ', 'SO');

  return (
    <div>
      <PageHeader
        crumbs={['Orders', so]}
        icon={Factory}
        title={so}
        badges={<><Badge tone="blue" dot>In production</Badge>{late.length > 0 && <Badge tone="red" dot>{plural(late.length, 'exception')}</Badge>}</>}
        meta={[<><Building2 className="h-3.5 w-3.5" />{customer}</>, <><FileText className="h-3.5 w-3.5" />From {rfq.reference.replace('RFQ', 'QT')}</>, <>{plural(included.length, 'line')}</>]}
      />
      <div className="mb-4"><StagePath stages={['Accepted', 'Orders placed', 'In production', 'Shipped', 'Delivered']} current={2} /></div>
      <Grid>
        <Card title="Delivery schedule" icon={Calendar} action="weeks from order · simulated" pad={false}>
          <div className="px-4 pb-3 pt-3">
            <div>
              <div className="flex">
                <span className="w-[128px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.05em] text-ink-400">Line · supplier</span>
                <div className="relative h-5 flex-1">
                  {ticks.map((w) => (
                    <span key={w} className="absolute -translate-x-1/2 text-[10px] text-ink-400" style={{ left: pct(w * 7) }}>{w}</span>
                  ))}
                </div>
              </div>
              <div className="relative border-t border-ink-100">
                <div className="pointer-events-none absolute inset-y-0 left-[128px] right-0">
                  {ticks.map((w) => <span key={w} className="absolute inset-y-0 w-px bg-ink-50" style={{ left: pct(w * 7) }} />)}
                  {deadline !== null && (
                    <span className="absolute inset-y-0 z-10 border-l-2 border-dashed border-action-500" style={{ left: pct(deadline) }}>
                      <span className="absolute left-1 top-1 whitespace-nowrap rounded bg-action-600 px-1 text-[9.5px] font-medium text-white">Deadline</span>
                    </span>
                  )}
                </div>
                <ul>
                  {included.map((l, i) => {
                    const d = leadDays(l);
                    const over = deadline !== null && d > deadline;
                    const inside = d / span > 0.22;
                    return (
                      <li key={l.line} className="flex h-11 items-center border-b border-ink-50 last:border-0">
                        <span className="w-[128px] shrink-0 pr-3">
                          <span className="mono block text-[11.5px] font-medium text-signal-700">{l.partNumber}</span>
                          <span className="block truncate text-[10.5px] text-ink-400">{supplierFor(l.name)}</span>
                        </span>
                        <span className="relative h-5 flex-1">
                          <span
                            className={`step-in absolute inset-y-0 left-0 flex items-center rounded ${over ? 'bg-action-500' : 'bg-signal-500'}`}
                            style={{ width: pct(d), ...T(i * 100) }}
                          >
                            {inside && <span className="px-2 text-[10.5px] font-medium text-white">{duration(d, true)}</span>}
                          </span>
                          {!inside && <span className="absolute inset-y-0 flex items-center pl-1.5 text-[10.5px] text-ink-600" style={{ left: pct(d) }}>{duration(d, true)}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </Card>

        <Rail>
          {late.length > 0 ? (
            <section className="overflow-hidden rounded-lg border border-action-600/25 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <header className="flex items-center gap-2 border-b border-action-600/15 bg-[#fdf3f3] px-4 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-action-600" />
                <h3 className="text-[12.5px] font-semibold text-ink-900">Delivery exception</h3>
              </header>
              <div className="p-4">
                <p className="text-[12px] leading-snug text-ink-600">
                  <span className="mono font-medium text-ink-900">{late.map((l) => l.partNumber).join(', ')}</span>{' '}
                  {late.length === 1 ? 'is' : 'are'} due after the customer’s deadline. Choose how to handle it:
                </p>
                <div className="mt-3 space-y-2">
                  {LATE_OPTIONS.map((o) => {
                    const on = decision === o;
                    return (
                      <button
                        key={o}
                        onClick={() => onDecide(o)}
                        className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left ring-1 ring-inset transition-colors ${on ? 'bg-signal-50 ring-signal-500' : 'ring-ink-200 hover:bg-ink-25'}`}
                      >
                        <span className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ring-1 ${on ? 'bg-signal-600 ring-signal-600' : 'ring-ink-300'}`}>
                          {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span>
                          <span className="block text-[12px] font-medium text-ink-900">{o}</span>
                          <span className="block text-[11px] leading-snug text-ink-500">{LATE_DETAIL[o]}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <Card title="Tracking" icon={CheckCircle2}>
              <p className="text-[12px] leading-snug text-ink-600">Every line is due inside the deadline. The system flags any that slip.</p>
            </Card>
          )}
          <Card title="Details">
            <Fields rows={[
              ['Customer', customer],
              ['Quote', rfq.reference.replace('RFQ', 'QT')],
              ['Needed within', deadline ? duration(deadline) : 'Not stated'],
              ['Latest line', duration(Math.max(...included.map(leadDays), 0))],
            ]} />
          </Card>
        </Rail>
      </Grid>
    </div>
  );
}
