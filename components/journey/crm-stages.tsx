'use client';

import {
  AlertTriangle, BookOpen, Building2, Calendar, CheckCircle2, CircleDashed, Clock, CreditCard,
  Factory, FileText, History, Inbox, Mail, MapPin, MessageSquare, Phone, Plane, Plus, Send,
  ShieldCheck, Sparkles, Timer, Truck, UserPlus, Users, Wrench, XCircle, Zap, HelpCircle, ExternalLink, PoundSterling,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PLANS, SITES, aircraftLabel, duration, gbp, shortDate, variantTag, type DeliveryPlan, type Region, type SiteId, type Source } from '@/lib/journey.ts';
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
const ENQUIRY_STAGES = ['New', 'Qualifying', 'Engineering', 'Supply', 'Quote', 'Won'];
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
        <p className="mono text-[11.5px] font-medium text-signal-700">{l.partNumber ?? '–'}</p>
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
    rfq.aircraft
      ? { icon: Plane, text: `${aircraftLabel(rfq.aircraft)}${rfq.variant ? (variantTag(rfq.variant).startsWith('-') ? variantTag(rfq.variant) : ` ${variantTag(rfq.variant)}`) : ''} and ${plural(rfq.lines.length, 'part')} recorded` }
      : { icon: Plane, text: `${plural(rfq.lines.length, 'part')} recorded; no aircraft stated, flagged for ${owner} to confirm` },
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
              <thead><tr><Th>Part</Th><Th right className="w-14 max-sm:hidden">Qty</Th><Th right className="w-28 sm:w-32">Lead time</Th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {rfq.lines.map((l) => (
                  <tr key={l.line}>
                    <Td><PartCell l={l} /></Td>
                    <Td right className="text-ink-700 max-sm:hidden">1</Td>
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
        <Stat label="Won to date" value={account.stats.wonGbp ? gbp(account.stats.wonGbp) : '–'} sub={plural(account.stats.won, 'order')} />
        <Stat label="Win rate" value={account.stats.winRatePct === null ? '–' : `${account.stats.winRatePct}%`} sub={`${account.stats.won} of ${account.stats.decided} decided`} />
        <Stat label="Open quotes" value={account.stats.pipelineGbp ? gbp(account.stats.pipelineGbp) : '–'} sub="awaiting the customer" />
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
                <thead><tr><Th>Reference</Th><Th className="max-sm:hidden">Date</Th><Th>Aircraft · work</Th><Th>Status</Th><Th right>Value</Th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  <tr className="bg-signal-50/50">
                    <Td className="mono whitespace-nowrap font-medium text-signal-700">{rfq.reference}</Td>
                    <Td className="whitespace-nowrap text-ink-500 max-sm:hidden">Today</Td>
                    <Td className="text-ink-800">{[aircraftLabel(rfq.aircraft), plural(rfq.lines.length, 'part')].filter(Boolean).join(' · ')}</Td>
                    <Td><Badge tone="red" dot>New</Badge></Td>
                    <Td right className="text-ink-400">–</Td>
                  </tr>
                  {account.jobs.map((j) => (
                    <tr key={j.reference} className="hover:bg-ink-25">
                      <Td className="mono whitespace-nowrap text-ink-600">{j.reference}</Td>
                      <Td className="whitespace-nowrap text-ink-500 max-sm:hidden">{shortDate(j.date)}</Td>
                      <Td className="text-ink-800">{[j.aircraft, j.application?.toLowerCase()].filter(Boolean).join(' · ')}</Td>
                      <Td><Badge tone={JOB[j.status].tone} dot>{JOB[j.status].text}</Badge></Td>
                      <Td right className="mono whitespace-nowrap text-ink-800">{j.valueGbp ? gbp(j.valueGbp) : '–'}</Td>
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
              <p className="p-4 text-[12px] text-ink-500">Little on file beyond the profile, which is itself worth knowing before replying.</p>
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
            {rfq.aircraft && !account.fleet.some((f) => f.toUpperCase() === rfq.aircraft!.toUpperCase()) && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fdf6ea] px-3 py-2 text-[11.5px] leading-snug text-ink-700 ring-1 ring-inset ring-caution-500/25">
                <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-caution-600" />
                <span>
                  <span className="font-semibold text-ink-900">First {aircraftLabel(rfq.aircraft)} enquiry from this account.</span>{' '}
                  Their fleet on record is {account.fleet.join(' and ')}. A new type, or third-party work? Worth one question before quoting.
                </span>
              </p>
            )}
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
        <Stat label="Won to date" value="–" sub="no orders" />
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
        <Stat label="To Supply" value={String(toProc)} sub="lead time to confirm" />
      </div>
      <Card title="Line check" icon={CheckCircle2} action="against each catalogue record" pad={false}>
        <ul className="divide-y divide-ink-100 sm:hidden">
          {rfq.lines.map((l) => {
            const over = rfq.deadlineDays !== null && l.leadTimeDays !== null && l.leadTimeDays > rfq.deadlineDays;
            return (
              <li key={l.line} className="px-3 py-3">
                <PartCell l={l} />
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[42px] text-[11.5px]">
                  {has(l, 'review')
                    ? <span className="flex items-center gap-1 text-caution-600"><AlertTriangle className="h-3 w-3" />Fit not established</span>
                    : <span className="flex items-center gap-1 text-strong-600"><CheckCircle2 className="h-3 w-3" />Fit confirmed</span>}
                  {l.leadTimeDays === null
                    ? <span className="flex items-center gap-1 text-caution-600"><AlertTriangle className="h-3 w-3" />Lead time not published</span>
                    : <span className={`flex items-center gap-1 ${over ? 'text-action-600' : 'text-strong-600'}`}>{over ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{duration(l.leadTimeDays)}</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 pl-[42px]">
                  {!l.flags.length && <Badge tone="green">Ready</Badge>}
                  {has(l, 'review') && <Badge tone="amber">Engineering</Badge>}
                  {has(l, 'supplier') && <Badge tone="blue">Supply</Badge>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
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
                        {has(l, 'supplier') && <Badge tone="blue">Supply</Badge>}
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
          <><Plane className="h-3.5 w-3.5" />{aircraftLabel(rfq.aircraft) ?? 'Aircraft not stated'}{rfq.variant ? ` (${variantTag(rfq.variant)} stated)` : ''}{rfq.engine ? ` · ${rfq.engine}` : ''}</>,
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
                {guidance.citations?.[0] && <span className="ml-1.5 whitespace-nowrap text-[10.5px] text-ink-400">· {guidance.citations[0].path}</span>}
              </p>
            </div>
          )}
        </section>
      )}

      <div className="space-y-3">
        {!lines.length && (
          <Card><p className="text-[12.5px] text-ink-600">Nothing in the queue: every line establishes what the customer asked for.</p></Card>
        )}
        {lines.some((l) => decisions[l.line] === 'query') && (
          <section className="step-in overflow-hidden rounded-lg border border-signal-600/25 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <header className="flex items-center gap-2 border-b border-signal-600/15 bg-signal-50 px-4 py-2.5">
              <MessageSquare className="h-3.5 w-3.5 text-signal-600" />
              <h3 className="text-[12.5px] font-semibold text-ink-900">Question to the customer</h3>
              <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-ink-400"><Sparkles className="h-3 w-3 text-[#6d4fe0]" />Drafted by the system · the account owner sends it</span>
            </header>
            <div className="px-4 py-3 text-[12px] leading-relaxed text-ink-700">
              <p className="text-ink-400">Subject <span className="ml-2 font-medium text-ink-800">Your enquiry {rfq.reference}: a question before we quote</span></p>
              <p className="mt-2">Thank you for your enquiry. Before we quote, our engineering team would like to check {lines.filter((l) => decisions[l.line] === 'query').length === 1 ? 'one item' : 'a few items'} against your aircraft:</p>
              <ul className="mt-2 space-y-1.5">
                {lines.filter((l) => decisions[l.line] === 'query').map((l) => {
                  const c = checksOf(l)[0];
                  return (
                    <li key={l.line} className="flex gap-2">
                      <span className="mono shrink-0 text-signal-700">{l.partNumber}</span>
                      <span>{c ? `${c.question} Our catalogue lists it as: ${c.catalogue}. You asked for: ${c.asked}.` : 'Could you confirm the exact application?'}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2">The remaining items are being priced now and will follow as one quotation.</p>
              <p className="mt-2 text-[10.5px] text-ink-400">Mock-up: nothing is sent. The held lines stay off the quote until the customer answers.</p>
            </div>
          </section>
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

/* --------------------------------------------------------------- 5 supply */

const SOURCE_BADGE: Record<Source['kind'], { tone: Tone; text: string }> = {
  make: { tone: 'blue', text: 'Made by Field' },
  stock: { tone: 'green', text: 'Ex-stock' },
  'bought-in': { tone: 'violet', text: 'Bought in' },
};

/**
 * Where each line comes from. The system proposes the fastest door-to-door
 * option for the customer's region; the planner can overrule any site, and
 * nothing is sent to a supplier until the plan is confirmed.
 */
export function SupplyScreen({
  rfq, lines, region, sourceOf, sites, onSite, confirmed, onConfirm, replies,
}: {
  rfq: SimRfq; lines: SimLine[]; region: Region; sourceOf: (l: SimLine) => Source;
  sites: Record<number, SiteId>; onSite: (line: number, site: SiteId) => void;
  confirmed: boolean; onConfirm: () => void; replies: Record<number, number>;
}) {
  const deadline = rfq.deadlineDays;
  const made = lines.filter((l) => sourceOf(l).kind === 'make');
  const stock = lines.filter((l) => sourceOf(l).kind === 'stock');
  const bought = lines.filter((l) => sourceOf(l).kind === 'bought-in');
  const chosen = (l: SimLine): SiteId | null => {
    const s = sourceOf(l);
    return s.kind === 'make' ? (sites[l.line] ?? s.proposed) : s.kind === 'stock' ? s.site : null;
  };
  const daysOf = (l: SimLine): number | null => {
    const s = sourceOf(l);
    if (s.kind === 'stock') return s.days;
    if (s.kind === 'make') return s.options.find((o) => o.site === chosen(l))!.totalDays;
    return confirmed ? (replies[l.line] ?? null) : null;
  };
  const perSite = (Object.keys(SITES) as SiteId[]).map((id) => ({ id, ...SITES[id], count: lines.filter((l) => chosen(l) === id).length }));
  const known = lines.map(daysOf).filter((d): d is number => d !== null);
  const latest = known.length ? Math.max(...known) : null;
  const complete = latest !== null && known.length === lines.length;

  return (
    <div>
      <PageHeader
        crumbs={['Supply', 'Enquiry plans', rfq.reference]}
        icon={Factory}
        title="Where each line comes from"
        badges={confirmed ? <Badge tone="green" dot>Plan confirmed</Badge> : <Badge tone="amber" dot>Awaiting you</Badge>}
        meta={[
          <><Inbox className="h-3.5 w-3.5" />{rfq.reference}</>,
          <><MapPin className="h-3.5 w-3.5" />Deliver to {region}</>,
          ...(deadline ? [<><Timer className="h-3.5 w-3.5" />Customer needs within {duration(deadline)}</>] : []),
        ]}
        actions={!confirmed
          ? <Button icon={CheckCircle2} variant="primary" size="md" onClick={onConfirm}>Confirm the plan{bought.length ? ` and send ${plural(bought.length, 'supplier request')}` : ''}</Button>
          : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Made by Field" value={String(made.length)} sub="under licence, four factories" />
        <Stat label="From stock" value={String(stock.length)} sub="published as in stock" tone={stock.length ? 'good' : undefined} />
        <Stat label="Bought in" value={String(bought.length)} sub="the Dillon range" />
        <Stat
          label="Complete delivery"
          value={latest !== null ? duration(latest) : '–'}
          sub={!complete ? 'awaiting a supplier reply' : deadline ? (latest! > deadline ? `after the ${duration(deadline)} asked` : 'inside the deadline') : 'no deadline stated'}
          tone={complete && deadline ? (latest! > deadline ? 'bad' : 'good') : undefined}
        />
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {perSite.map((s) => (
          <div key={s.id} className={`rounded-lg border bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${s.count ? 'border-signal-600/30' : 'border-ink-100'}`}>
            <p className="flex items-center justify-between gap-2 text-[12.5px] font-semibold text-ink-900">
              <span className="flex items-center gap-1.5"><Factory className={`h-3.5 w-3.5 ${s.count ? 'text-signal-600' : 'text-ink-300'}`} />{s.name}</span>
              <span className="text-[11px] font-medium text-ink-400">{s.country}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{s.note}</p>
            <p className="mt-2 text-[11.5px] font-medium">
              {s.count ? <span className="text-signal-700">{plural(s.count, 'line')} planned here</span> : <span className="text-ink-300">nothing planned here</span>}
            </p>
          </div>
        ))}
      </div>

      <Card title="Source per line" icon={Truck} action="stock, site lead times and costs are simulated" pad={false}>
        <ul className="divide-y divide-ink-100">
          {lines.map((l, i) => {
            const s = sourceOf(l);
            const d = daysOf(l);
            const late = deadline !== null && d !== null && d > deadline;
            return (
              <li key={l.line} className="step-in px-4 py-3" style={T(i * 90)}>
                <div className="flex flex-wrap items-start gap-3">
                  <PartCell l={l} sub={<p className="mt-1 text-[11px] text-ink-500">{s.kind === 'make' ? s.licence : s.kind === 'stock' ? `Published as in stock; ships from ${SITES[s.site].name}` : s.range}</p>} />
                  <span className="ml-auto flex items-center gap-2">
                    <Badge tone={SOURCE_BADGE[s.kind].tone}>{SOURCE_BADGE[s.kind].text}</Badge>
                    {d !== null
                      ? <span className={`mono text-[12px] font-medium ${late ? 'text-action-600' : 'text-strong-600'}`}>{duration(d)}</span>
                      : <span className="text-[11.5px] text-ink-400">awaiting reply</span>}
                  </span>
                </div>

                {s.kind === 'make' && (
                  <div className="mt-2.5 grid gap-1.5 sm:grid-cols-4">
                    {s.options.map((o) => {
                      const on = chosen(l) === o.site;
                      const fastest = o.site === s.proposed;
                      const cheapest = o.costIndex === Math.min(...s.options.map((x) => x.costIndex));
                      const over = deadline !== null && o.totalDays > deadline;
                      return (
                        <button
                          key={o.site}
                          disabled={confirmed}
                          onClick={() => onSite(l.line, o.site)}
                          className={`rounded-lg px-2.5 py-2 text-left ring-1 ring-inset transition-colors disabled:cursor-default ${on ? 'bg-signal-50 ring-signal-500' : 'ring-ink-200 hover:bg-ink-25'}`}
                        >
                          <span className="flex items-center justify-between gap-2 text-[12px] font-medium text-ink-900">
                            {SITES[o.site].name}
                            <span className={`mono ${over ? 'text-action-600' : 'text-ink-700'}`}>{o.totalDays} days</span>
                          </span>
                          <span className="mt-0.5 block text-[10.5px] leading-snug text-ink-500">
                            make {o.makeDays} d, ship {o.freightDays} d · cost {o.costIndex < 1 ? `−${Math.round((1 - o.costIndex) * 100)}%` : 'base'}
                          </span>
                          {(fastest || cheapest) && (
                            <span className="mt-1 flex gap-1">
                              {fastest && <Badge tone="blue">fastest</Badge>}
                              {cheapest && <Badge tone="green">cheapest</Badge>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {s.kind === 'bought-in' && (
                  <div className="mt-2.5 rounded-lg bg-ink-25 px-3 py-2.5 text-[12px] text-ink-700 ring-1 ring-inset ring-ink-100">
                    <p className="text-ink-400">To <span className="ml-2 font-medium text-ink-800">{s.supplier}</span> · Subject <span className="ml-2 font-medium text-ink-800">Lead time request: {rfq.reference}</span></p>
                    <p className="mt-1.5 leading-relaxed">
                      Please confirm your current lead time for {l.partNumber} for delivery to Field. We are quoting a customer who needs it within {deadline ? `${deadline} days` : 'a stated window'}.
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-ink-400">
                      <Sparkles className="h-3 w-3 text-[#6d4fe0]" />
                      {confirmed ? `Sent. Reply, simulated: ${duration(replies[l.line] ?? 0)}` : 'Drafted by the system · not sent until the plan is confirmed'}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
        The four factories and the Boeing licences are Field’s, as published. Which site makes which tool, what is in stock where,
        site lead times, freight and cost differences are invented for this demo.
      </p>
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
  rfq, customer, account, lines, prices, chosen, onPrice, confirmed, onConfirm, sourceLabel,
}: {
  rfq: SimRfq; customer: string; account: CrmAccount | null; lines: SimLine[];
  prices: LinePrice[]; chosen: Record<number, number>; onPrice: (line: number, price: number) => void;
  confirmed: boolean; onConfirm: () => void; sourceLabel: (l: SimLine) => string;
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
        <Stat label="Landed cost" value={gbpExact(landed)} sub="cost + freight" />
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
                <span className="hidden text-right sm:block">
                  <span className="block text-[10.5px] text-ink-400">Source</span>
                  <span className="block text-[11.5px] text-ink-700">{sourceLabel(l)}</span>
                </span>
              </div>
              <div className="grid gap-px border-t border-ink-100 bg-ink-100 md:grid-cols-[1fr_1.15fr_1fr]">
                <div className="bg-white p-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">How the price is built<Synth /></p>
                  <dl className="space-y-1 text-[12px]">
                    <Row k="Works or supplier cost" v={gbpExact(p.cost)} />
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
  prices, margin, pricedBy, belowMin, lateLines, plan, onPlan, expedite, queried, sourceLabel,
}: {
  rfq: SimRfq; customer: string; contact: Contact; included: SimLine[]; held: SimLine[];
  /** Lead time with the delivery plan applied. */
  leadDays: (l: SimLine) => number; deliveryDays: number | null;
  decision: 'approved' | 'returned' | null; onDecide: (d: 'approved' | 'returned') => void;
  reviewed: number; supplierAsked: number; approver: string;
  prices: Record<number, number>; margin: number; pricedBy: string; belowMin: number;
  lateLines: SimLine[]; plan: DeliveryPlan | null; onPlan: (p: DeliveryPlan) => void;
  expedite: Record<number, { accepted: boolean; surchargePct: number }>; queried: SimLine[]; sourceLabel: (l: SimLine) => string;
}) {
  const total = included.reduce((a, l) => a + (prices[l.line] ?? 0), 0);
  const deadline = rfq.deadlineDays;
  const lateCount = lateLines.length;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const qt = rfq.reference.replace('RFQ', 'QT');
  const inTime = deadline === null ? included : included.filter((l) => !lateLines.some((x) => x.line === l.line));
  const pulled = lateLines.filter((l) => expedite[l.line]?.accepted);
  const refused = lateLines.filter((l) => !expedite[l.line]?.accepted);
  const planDetail = !lateCount ? 'all in time'
    : !plan ? `${plural(lateCount, 'line')} late: choose how to handle it`
    : plan === 'phased' ? `${plural(lateCount, 'line')} late: phased delivery offered`
    : plan === 'expedite' ? `expedite asked on ${plural(lateCount, 'line')}: ${pulled.length} pulled forward, ${refused.length} refused (simulated)`
    : `${plural(lateCount, 'line')} quoted at the dates we can meet`;
  const checks: Array<{ ok: boolean; label: string; detail: string }> = [
    { ok: true, label: 'Engineering review', detail: reviewed ? `${plural(reviewed, 'line')} decided${held.length ? `, ${held.length} held back` : ''}` : 'not needed' },
    { ok: true, label: 'Supplier lead times', detail: supplierAsked ? `${supplierAsked} confirmed` : 'all published' },
    { ok: !lateCount || Boolean(plan), label: 'Delivery against deadline', detail: planDetail },
    { ok: margin >= MIN_MARGIN && !belowMin, label: 'Pricing', detail: `${gbpExact(total)} at ${(margin * 100).toFixed(1)}% margin${belowMin ? ` · ${plural(belowMin, 'line')} below the 20% minimum` : ''} · set by ${pricedBy} · synthetic` },
  ];
  const deliveryLine = (() => {
    if (deliveryDays === null) return 'Delivery: to be confirmed';
    if (!lateCount || deadline === null) return `Delivery: all items within ${duration(deliveryDays)}${deadline ? ` (requested ${duration(deadline)})` : ''}`;
    if (plan === 'phased') return `Delivery: ${plural(inTime.length, 'item')} within ${duration(deadline)} as requested; ${plural(lateCount, 'item')} to follow within ${duration(deliveryDays)}`;
    if (plan === 'expedite') {
      return refused.length
        ? `Delivery: ${plural(included.length - refused.length, 'item')} within ${duration(deadline)}; ${plural(refused.length, 'item')} within ${duration(deliveryDays)}`
        : `Delivery: all items within ${duration(deadline)} as requested (expedited)`;
    }
    if (plan === 'realistic') return `Delivery: ${plural(inTime.length, 'item')} within ${duration(deadline)} as requested; ${plural(lateCount, 'item')} within ${duration(deliveryDays)}, which cannot be improved`;
    return `Delivery: all items within ${duration(deliveryDays)} (requested ${duration(deadline)})`;
  })();
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
        {lateCount > 0 && (
          <section className={`overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${plan ? 'border-ink-100' : 'border-caution-500/40'}`}>
            <header className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 ${plan ? 'border-ink-100 bg-ink-25' : 'border-caution-500/20 bg-[#fdf6ea]'}`}>
              {plan ? <CheckCircle2 className="h-3.5 w-3.5 text-strong-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-caution-600" />}
              <h3 className="text-[12.5px] font-semibold text-ink-900">Delivery against the deadline</h3>
              <span className="ml-auto text-[11px] text-ink-500">
                {plural(lateCount, 'line')} of {included.length} after the customer’s {duration(deadline!)}
              </span>
            </header>
            <div className="px-4 py-3">
              <p className="text-[12px] leading-snug text-ink-600">
                <span className="mono font-medium text-ink-900">{lateLines.map((l) => l.partNumber).join(', ')}</span>{' '}
                {lateCount === 1 ? 'lands' : 'land'} after the deadline on {lateCount === 1 ? 'its' : 'their'} catalogue lead time. The customer decides on delivery as much as price, so this is settled before the quote goes out, not after the order.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {PLANS.map((o) => {
                  const on = plan === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => onPlan(o.id)}
                      className={`flex items-start gap-2.5 rounded-lg p-2.5 text-left ring-1 ring-inset transition-colors ${on ? 'bg-signal-50 ring-signal-500' : 'ring-ink-200 hover:bg-ink-25'}`}
                    >
                      <span className={`mt-0.5 grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ring-1 ${on ? 'bg-signal-600 ring-signal-600' : 'ring-ink-300'}`}>
                        {on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span>
                        <span className="block text-[12px] font-medium text-ink-900">{o.title}</span>
                        <span className="block text-[11px] leading-snug text-ink-500">{o.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {plan === 'expedite' && (
                <ul className="mt-3 divide-y divide-ink-100 rounded-lg ring-1 ring-inset ring-ink-100">
                  {lateLines.map((l, i) => {
                    const e = expedite[l.line]!;
                    return (
                      <li key={l.line} className="step-in flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[12px]" style={T(150 + i * 200)}>
                        <span className="mono font-medium text-signal-700">{l.partNumber}</span>
                        <span className="text-ink-500">{sourceLabel(l)} replies:</span>
                        {e.accepted
                          ? <span className="flex items-center gap-1.5 text-strong-600"><CheckCircle2 className="h-3.5 w-3.5" />can deliver within {duration(deadline!)} for +{e.surchargePct}%</span>
                          : <span className="flex items-center gap-1.5 text-action-600"><XCircle className="h-3.5 w-3.5" />cannot pull {duration(leadDays(l))} forward</span>}
                        <span className="ml-auto text-[10.5px] text-ink-400">simulated</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {plan === 'phased' && (
                <p className="mt-3 text-[11.5px] text-ink-500">
                  Shipment 1 by the deadline: {plural(inTime.length, 'line')}. Shipment 2 within {duration(deliveryDays ?? 0)}: {plural(lateCount, 'line')}.
                </p>
              )}
            </div>
          </section>
        )}
        <SyntheticPrices compact />
        <div className="relative min-w-0 overflow-hidden rounded-md bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_12px_32px_-16px_rgba(16,24,40,0.25)] ring-1 ring-ink-100 sm:p-8">
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
            <table className="mt-5 w-full table-fixed text-[11.5px] sm:min-w-[400px]">
              <thead>
                <tr className="border-y border-ink-200 text-left text-[10px] uppercase tracking-[0.06em] text-ink-500">
                  <th className="w-6 py-2 font-semibold">#</th><th className="w-24 font-semibold">Part</th><th className="font-semibold max-sm:hidden">Description</th>
                  <th className="w-9 text-right font-semibold max-sm:hidden">Qty</th><th className="w-[4.5rem] text-right font-semibold">Lead time</th><th className="w-24 text-right font-semibold">Unit price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {included.map((l, i) => {
                  const over = deadline !== null && leadDays(l) > deadline;
                  const pulledForward = plan === 'expedite' && expedite[l.line]?.accepted;
                  return (
                    <tr key={l.line}>
                      <td className="py-2 text-ink-400">{i + 1}</td>
                      <td className="mono text-signal-700">{l.partNumber}</td>
                      <td className="truncate pr-2 text-ink-800 max-sm:hidden">{l.name}</td>
                      <td className="text-right text-ink-700 max-sm:hidden">1</td>
                      <td className={`text-right ${over ? 'font-medium text-action-600' : 'text-ink-700'}`}>
                        {duration(leadDays(l), true)}{pulledForward && <span className="ml-1 text-[9px] uppercase tracking-[0.06em] text-signal-600">expedited</span>}
                      </td>
                      <td className="mono whitespace-nowrap text-right text-ink-900">{gbpExact(prices[l.line] ?? 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-ink-200 pt-3 text-[11.5px]">
            <span className={lateCount && !plan ? 'font-medium text-action-600' : 'text-ink-500'}>{deliveryLine}</span>
            <span className="font-semibold text-ink-950">Total {gbpExact(total)} <span className="text-[10px] font-bold tracking-[0.08em] text-[#5b3fc4]">SYNTHETIC</span></span>
          </div>
          <p className="mt-4 text-[10.5px] leading-relaxed text-ink-400">
            {queried.length > 0 && `${plural(queried.length, 'line')} held while the customer answers Engineering’s question. `}
            {held.length - queried.length > 0 && `${plural(held.length - queried.length, 'line')} removed at review. `}
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
                disabled={lateCount > 0 && !plan}
                title={lateCount > 0 && !plan ? 'Choose how the late lines are handled first' : undefined}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-strong-600 text-[12.5px] font-medium text-white transition-colors hover:bg-strong-500 disabled:cursor-not-allowed disabled:opacity-40"
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

/** What Operations can still do once an expedite has been refused. */
export const LATE_OPTIONS = ['Ship the rest now and the late lines when ready', 'Agree a new date with the customer'];
const LATE_DETAIL: Record<string, string> = {
  'Ship the rest now and the late lines when ready': 'A part shipment by the deadline, with an advice note; the late lines follow.',
  'Agree a new date with the customer': 'The account owner calls the customer with the realistic date before it slips.',
};

export function OrderScreen({
  rfq, customer, included, leadDays, catalogueDays, plan, expedite, stillLate, decision, onDecide, sourceLabel,
}: {
  rfq: SimRfq; customer: string; included: SimLine[];
  /** Lead time with the delivery plan applied, and as the catalogue published it. */
  leadDays: (l: SimLine) => number; catalogueDays: (l: SimLine) => number;
  plan: DeliveryPlan | null; expedite: Record<number, { accepted: boolean; surchargePct: number }>;
  stillLate: SimLine[]; decision: string | null; onDecide: (d: string) => void; sourceLabel: (l: SimLine) => string;
}) {
  const deadline = rfq.deadlineDays;
  const longestDays = Math.max(...included.map(leadDays), deadline ?? 0, 7);
  const totalWeeks = Math.max(2, Math.ceil(longestDays / 7 / 2) * 2);
  const span = totalWeeks * 7;
  const pct = (d: number) => `${(d / span) * 100}%`;
  const ticks = Array.from({ length: totalWeeks / 2 + 1 }, (_, i) => i * 2);
  const late = stillLate;
  const afterDeadline = (l: SimLine) => deadline !== null && leadDays(l) > deadline;
  const so = rfq.reference.replace('RFQ', 'SO');
  const planLabel = PLANS.find((p) => p.id === plan)?.title ?? 'No late lines';
  // A phased order ships in two groups; everything else is one schedule.
  const groups: Array<{ label: string | null; lines: SimLine[] }> = plan === 'phased' && deadline !== null
    ? [
        { label: `Shipment 1 · by the deadline`, lines: included.filter((l) => !afterDeadline(l)) },
        { label: `Shipment 2 · follows`, lines: included.filter(afterDeadline) },
      ]
    : [{ label: null, lines: included }];
  // The marker on the chart: the customer's deadline, or the later date they agreed to.
  const marker = plan === 'realistic' && deadline !== null && included.some(afterDeadline)
    ? { at: Math.max(...included.map(leadDays)), label: 'Agreed date' }
    : deadline !== null ? { at: deadline, label: 'Deadline' } : null;

  return (
    <div>
      <PageHeader
        crumbs={['Orders', so]}
        icon={Factory}
        title={so}
        badges={<><Badge tone="blue" dot>In production</Badge>{plan === 'phased' && <Badge tone="violet">Phased</Badge>}{late.length > 0 && <Badge tone="red" dot>{plural(late.length, 'exception')}</Badge>}</>}
        meta={[<><Building2 className="h-3.5 w-3.5" />{customer}</>, <><FileText className="h-3.5 w-3.5" />From {rfq.reference.replace('RFQ', 'QT')}</>, <>{plural(included.length, 'line')}</>]}
      />
      <div className="mb-4"><StagePath stages={['Accepted', 'Orders placed', 'In production', 'Shipped', 'Delivered']} current={2} /></div>
      <Grid>
        <Card title="Delivery schedule" icon={Calendar} action="weeks from order · simulated" pad={false}>
          <div className="px-4 pb-3 pt-3">
            <div>
              <div className="flex">
                <span className="w-[92px] shrink-0 text-[10px] font-semibold uppercase sm:w-[128px] tracking-[0.05em] text-ink-400">Line · source</span>
                <div className="relative h-5 flex-1">
                  {ticks.map((w) => (
                    <span key={w} className="absolute -translate-x-1/2 text-[10px] text-ink-400" style={{ left: pct(w * 7) }}>{w}</span>
                  ))}
                </div>
              </div>
              <div className="relative border-t border-ink-100">
                <div className="pointer-events-none absolute inset-y-0 left-[92px] right-0 sm:left-[128px]">
                  {ticks.map((w) => <span key={w} className="absolute inset-y-0 w-px bg-ink-50" style={{ left: pct(w * 7) }} />)}
                  {marker && (
                    <span className={`absolute inset-y-0 z-10 border-l-2 border-dashed ${marker.label === 'Deadline' ? 'border-action-500' : 'border-strong-600'}`} style={{ left: pct(marker.at) }}>
                      <span className={`absolute left-1 top-1 whitespace-nowrap rounded px-1 text-[9.5px] font-medium text-white ${marker.label === 'Deadline' ? 'bg-action-600' : 'bg-strong-600'}`}>{marker.label}</span>
                    </span>
                  )}
                </div>
                {groups.map((g) => (
                  <ul key={g.label ?? 'all'}>
                    {g.label && (
                      <li className="flex h-7 items-center border-b border-ink-50 bg-ink-25/70 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                        {g.label} · {plural(g.lines.length, 'line')}
                      </li>
                    )}
                    {g.lines.map((l, i) => {
                      const d = leadDays(l);
                      // Red only when the line will actually miss what the customer accepted.
                      const over = late.some((x) => x.line === l.line) || (plan !== 'realistic' && plan !== 'phased' && afterDeadline(l));
                      const pulled = plan === 'expedite' && expedite[l.line]?.accepted;
                      const inside = d / span > 0.22;
                      return (
                        <li key={l.line} className="flex h-11 items-center border-b border-ink-50 last:border-0">
                          <span className="w-[92px] shrink-0 pr-2 sm:w-[128px] sm:pr-3">
                            <span className="mono block text-[11.5px] font-medium text-signal-700">{l.partNumber}</span>
                            <span className="block truncate text-[10.5px] text-ink-400">{pulled ? `expedited, was ${duration(catalogueDays(l), true)}` : sourceLabel(l)}</span>
                          </span>
                          <span className="relative h-5 flex-1">
                            <span
                              className={`step-in absolute inset-y-0 left-0 flex items-center rounded ${over ? 'bg-action-500' : pulled ? 'bg-strong-600' : 'bg-signal-500'}`}
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
                ))}
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
                  could not be expedited and {late.length === 1 ? 'is' : 'are'} still due after the customer’s deadline. Choose how to handle it:
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
              <p className="text-[12px] leading-snug text-ink-600">
                {plan === 'phased'
                  ? 'Two shipments, both agreed with the customer on the quote. The system flags either if it slips.'
                  : plan === 'realistic'
                    ? 'The customer accepted the quoted dates, so nothing is late against what was agreed. The system flags any line that slips past it.'
                    : plan === 'expedite'
                      ? 'Every late line was pulled forward to the deadline. The system flags any that slip.'
                      : 'Every line is due inside the deadline. The system flags any that slip.'}
              </p>
            </Card>
          )}
          <Card title="Details">
            <Fields rows={[
              ['Customer', customer],
              ['Quote', rfq.reference.replace('RFQ', 'QT')],
              ['Needed within', deadline ? duration(deadline) : 'Not stated'],
              ['Delivery plan', deadline && included.some((l) => catalogueDays(l) > deadline) ? planLabel : 'Not needed'],
              ['Latest line', duration(Math.max(...included.map(leadDays), 0))],
            ]} />
          </Card>
        </Rail>
      </Grid>
    </div>
  );
}
