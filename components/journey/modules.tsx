'use client';

import { useEffect } from 'react';
import {
  AlertTriangle, BarChart3, Building2, CalendarClock, CheckCircle2, Clock, Factory, FileText, Globe2, Mail,
  Newspaper, Phone, Plane, ShieldCheck, Sparkles, TrendingUp, X,
} from 'lucide-react';
import { CrmFrame, PageHeader, type CrmModule } from '@/components/journey/frames.tsx';
import { Avatar, Badge, Button, Card, Stat, Td, Th } from '@/components/journey/ui.tsx';
import { gbp, shortDate } from '@/lib/journey.ts';

/*
 * Three of the uses that hang off the enquiry spine, as screens. Every figure
 * on them is SYNTHETIC: the company names, the certificates, the prospects, the
 * numbers. They show the shape of each screen, so Field can say "yes, that" or
 * "no, like this" before anything is built.
 */

export type ModuleId = 'pipeline' | 'recall' | 'prospects';

const SYNTH = (
  <span className="rounded bg-[#5b3fc4] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white">SYNTHETIC</span>
);

/* ---------------------------------------------------------------- pipeline */

const COMPANIES = [
  { name: 'Field International Ltd', place: 'Poole, UK', enquiries: 61, quotes: 44, open: 612_000, win: 38, reply: '2 h 40 m', late: 1 },
  { name: 'Field International PTE', place: 'Singapore', enquiries: 48, quotes: 35, open: 455_000, win: 41, reply: '3 h 05 m', late: 2 },
  { name: 'Field Int. Technologies', place: 'Singapore', enquiries: 19, quotes: 14, open: 188_000, win: 36, reply: '4 h 20 m', late: 0 },
  { name: 'Field International China', place: 'Jiaxing', enquiries: 27, quotes: 18, open: 203_000, win: 33, reply: '5 h 10 m', late: 1 },
  { name: 'Field Int. Engineering', place: 'Chennai', enquiries: 12, quotes: 8, open: 71_000, win: 29, reply: '6 h 30 m', late: 0 },
  { name: 'Field International LLC', place: 'Abu Dhabi', enquiries: 22, quotes: 16, open: 240_000, win: 44, reply: '3 h 50 m', late: 0 },
  { name: 'Field International USA', place: 'Clearwater, Florida', enquiries: 31, quotes: 22, open: 318_000, win: 35, reply: '2 h 55 m', late: 0 },
];

export function PipelineScreen() {
  const total = COMPANIES.reduce((a, c) => ({ enquiries: a.enquiries + c.enquiries, quotes: a.quotes + c.quotes, open: a.open + c.open, late: a.late + c.late }), { enquiries: 0, quotes: 0, open: 0, late: 0 });
  const max = Math.max(...COMPANIES.map((c) => c.enquiries));
  return (
    <div>
      <PageHeader
        crumbs={['Home', 'Group pipeline']}
        icon={BarChart3}
        title="This month, across the group"
        badges={SYNTH}
        meta={[<><Building2 className="h-3.5 w-3.5" />7 companies</>, <><Clock className="h-3.5 w-3.5" />Updated a minute ago</>]}
        actions={<Button icon={Mail}>Send the Monday digest</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Enquiries in" value={String(total.enquiries)} sub="all desks, this month" />
        <Stat label="Quotes out" value={String(total.quotes)} sub={`${Math.round((total.quotes / total.enquiries) * 100)}% of enquiries`} />
        <Stat label="Open quote value" value={gbp(total.open)} sub="awaiting customers" />
        <Stat label="Median first reply" value="3 h 20 m" sub="target: one working day" tone="good" />
        <Stat label="Late lines" value={String(total.late)} sub="against promised dates" tone={total.late ? 'bad' : 'good'} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card title="By company" icon={Factory} action="synthetic figures" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr><Th>Company</Th><Th>Enquiries</Th><Th right>Quotes</Th><Th right>Open value</Th><Th right>Win rate</Th><Th right>First reply</Th><Th right>Late</Th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {COMPANIES.map((c) => (
                  <tr key={c.name} className="hover:bg-ink-25">
                    <Td><span className="block font-medium text-ink-900">{c.name}</span><span className="block text-[11px] text-ink-400">{c.place}</span></Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <span className="h-2 rounded-full bg-signal-500" style={{ width: `${(c.enquiries / max) * 90}px` }} />
                        <span className="mono text-ink-700">{c.enquiries}</span>
                      </span>
                    </Td>
                    <Td right className="mono text-ink-700">{c.quotes}</Td>
                    <Td right className="mono text-ink-900">{gbp(c.open)}</Td>
                    <Td right className="mono text-ink-700">{c.win}%</Td>
                    <Td right className="mono text-ink-700">{c.reply}</Td>
                    <Td right>{c.late ? <Badge tone="red">{c.late}</Badge> : <Badge tone="green">0</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <section className="overflow-hidden rounded-lg border border-[#ddd5ff] bg-gradient-to-b from-[#f7f5ff] to-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex items-center gap-2 border-b border-[#ebe5ff] px-4 py-2.5">
            <Sparkles className="h-3.5 w-3.5 text-[#6d4fe0]" />
            <h3 className="text-[12.5px] font-semibold text-ink-900">Monday digest, drafted</h3>
          </header>
          <div className="space-y-2.5 px-4 py-3 text-[12px] leading-relaxed text-ink-700">
            <p>Enquiries are up 9% on last month, led by Singapore and the US desk. {total.quotes} quotes went out; {gbp(total.open)} is waiting on customers, {gbp(455_000)} of it in Asia Pacific.</p>
            <p>Two 777 landing-gear enquiries lost on lead time in Poole; both quoted over eight weeks. Jiaxing had capacity at six.</p>
            <p>Four late lines, all supplier-side; two at Meridian. Response times inside target on every desk except Chennai.</p>
            <p className="text-[10.5px] text-ink-400">Written by the system from the figures above. A person reads it before it goes to the board.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ recall */

const today = new Date();
const inDays = (n: number) => new Date(today.getTime() + n * 86_400_000).toISOString();

const CERTS = [
  { part: 'K78002-70', item: 'Sling equipment, thrust reverser sleeve, GEnx', customer: 'Singapore Aero MRO', kind: 'Proof load', due: inDays(12), value: 1_450, status: 'Quote ready' },
  { part: 'J32076-13', item: 'Sling equipment, inner cylinder, MLG', customer: 'Gulf Technical Services', kind: 'Proof load', due: inDays(19), value: 1_120, status: 'Reminder sent' },
  { part: '32224-0011', item: 'Dillon AP dynamometer, 10 inch', customer: 'Rhein Aviation Technik', kind: 'Calibration', due: inDays(27), value: 380, status: 'Reminder drafted' },
  { part: 'FIL8500', item: 'Proof-load lifting frame', customer: 'Atlantic Cargo Air', kind: 'Load test', due: inDays(41), value: 2_600, status: 'Reminder drafted' },
  { part: 'G32028-117', item: 'Jack, wing and body MLG', customer: 'Atlantic Cargo Air', kind: 'Load test', due: inDays(58), value: 3_900, status: 'Scheduled' },
  { part: 'J55004-35', item: 'Jacking equipment, horizontal stabilizer', customer: 'Gulf Technical Services', kind: 'Proof load', due: inDays(-6), value: 1_740, status: 'Overdue' },
];

export function RecallScreen() {
  const due30 = CERTS.filter((c) => Date.parse(c.due) - today.getTime() < 30 * 86_400_000);
  const atStake = CERTS.reduce((a, c) => a + c.value, 0);
  const tone = (s: string) => (s === 'Overdue' ? 'red' : s === 'Scheduled' ? 'green' : s === 'Quote ready' ? 'blue' : 'amber');
  return (
    <div>
      <PageHeader
        crumbs={['Service', 'Recertification', 'Due']}
        icon={CalendarClock}
        title="Certificates coming up for renewal"
        badges={SYNTH}
        meta={[<><ShieldCheck className="h-3.5 w-3.5" />Proof load, load test and calibration</>, <><Clock className="h-3.5 w-3.5" />Next 90 days</>]}
        actions={<Button icon={Mail} variant="primary">Send the drafted reminders</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Due in 30 days" value={String(due30.length)} sub="certificates" tone="bad" />
        <Stat label="Due in 90 days" value={String(CERTS.length)} sub="across 4 customers" />
        <Stat label="Recert revenue" value={gbp(atStake)} sub="if every one books" tone="good" />
        <Stat label="Booked this month" value="7" sub="from reminders" />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card title="Due register" icon={CalendarClock} action="from calibration and proof-load records" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead><tr><Th>Tool</Th><Th>Customer</Th><Th>Certificate</Th><Th>Due</Th><Th right>Value</Th><Th>Status</Th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {CERTS.map((c) => {
                  const days = Math.round((Date.parse(c.due) - today.getTime()) / 86_400_000);
                  return (
                    <tr key={c.part} className="hover:bg-ink-25">
                      <Td><span className="mono block text-[11.5px] font-medium text-signal-700">{c.part}</span><span className="block truncate text-[11.5px] text-ink-700">{c.item}</span></Td>
                      <Td className="text-ink-800">{c.customer}</Td>
                      <Td className="text-ink-700">{c.kind}</Td>
                      <Td><span className={`block ${days < 0 ? 'font-medium text-action-600' : days < 30 ? 'text-caution-600' : 'text-ink-700'}`}>{shortDate(c.due)}</span><span className="block text-[10.5px] text-ink-400">{days < 0 ? `${-days} days overdue` : `in ${days} days`}</span></Td>
                      <Td right className="mono text-ink-900">£{c.value.toLocaleString()}</Td>
                      <Td><Badge tone={tone(c.status)} dot>{c.status}</Badge></Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <section className="overflow-hidden rounded-lg border border-[#ddd5ff] bg-gradient-to-b from-[#f7f5ff] to-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex items-center gap-2 border-b border-[#ebe5ff] px-4 py-2.5">
            <Sparkles className="h-3.5 w-3.5 text-[#6d4fe0]" />
            <h3 className="text-[12.5px] font-semibold text-ink-900">Reminder, drafted</h3>
          </header>
          <div className="px-4 py-3 text-[12px] leading-relaxed text-ink-700">
            <p className="text-ink-400">To <span className="ml-2 text-ink-800">engineering@rhein-aviation-technik.example</span></p>
            <p className="mt-1 text-ink-400">Subject <span className="ml-2 text-ink-800">Calibration due: 32224-0011 dynamometer, 27 days</span></p>
            <p className="mt-3">The calibration certificate on your Dillon AP dynamometer 32224-0011 expires in 27 days. We can calibrate and return it within five working days from receipt; the quotation is attached and valid for 30 days.</p>
            <p className="mt-2">Reply with a date and we will book the slot and send collection labels.</p>
            <p className="mt-3 text-[10.5px] text-ink-400">Drafted by the system from the certificate record. The account owner sends it.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- prospects */

const PROSPECTS = [
  { name: 'Gulf Coast Aero Services', place: 'Mobile, Alabama', type: 'MRO', fleet: ['Boeing 737', 'Boeing 767'], fit: 1_240, trigger: 'Second widebody hangar announced', when: '3 days ago', call: 'Lead with 767 landing-gear and engine handling tooling' },
  { name: 'Sunbelt Cargo Airlines', place: 'Miami, Florida', type: 'Operator', fleet: ['Boeing 747', 'Boeing 777'], fit: 2_860, trigger: 'Two 777F deliveries this quarter', when: '1 week ago', call: 'Fleet induction tooling list for the 777F' },
  { name: 'Panhandle Technical', place: 'Pensacola, Florida', type: 'MRO', fleet: ['Boeing 737'], fit: 880, trigger: 'Hiring 40 technicians', when: '2 weeks ago', call: 'Neighbours from January: an open day at the new plant' },
  { name: 'Atlantic Southern Technics', place: 'Atlanta, Georgia', type: 'MRO', fleet: ['Boeing 757', 'Boeing 767', 'Boeing 777'], fit: 2_310, trigger: 'Heavy-check contract won for a 777 fleet', when: '2 weeks ago', call: '777 heavy-check tooling, quoted from Pensacola stock' },
  { name: 'Lone Star Aviation Support', place: 'San Antonio, Texas', type: 'MRO', fleet: ['Boeing 737', 'Boeing 787'], fit: 1_650, trigger: 'First 787 base check scheduled', when: '3 weeks ago', call: '787 GEnx thrust-reverser set' },
  { name: 'Bayou Air Freight', place: 'New Orleans, Louisiana', type: 'Operator', fleet: ['Boeing 767'], fit: 430, trigger: 'None this month', when: '', call: 'Calibration and proof-load service, local' },
];

export function ProspectsScreen() {
  return (
    <div>
      <PageHeader
        crumbs={['Prospects', 'North America', 'Pensacola opening']}
        icon={Globe2}
        title="Who to call before Pensacola opens"
        badges={SYNTH}
        meta={[<><Plane className="h-3.5 w-3.5" />Fleets matched to the catalogue</>, <><Newspaper className="h-3.5 w-3.5" />News watched weekly</>]}
        actions={<Button icon={Phone} variant="primary">Plan this week’s calls</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Targets in range" value="24" sub="operators and MROs, not customers" />
        <Stat label="With 777 or 787 fleets" value="9" sub="Field’s deepest catalogue" tone="good" />
        <Stat label="Triggers this month" value="6" sub="news worth a call" />
        <Stat label="Catalogue fit" value="2,860" sub="parts for the best match" />
      </div>
      <Card title="This week’s list" icon={TrendingUp} action="prospect names are synthetic; the method uses public fleet data and news" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr><Th>Prospect</Th><Th>Fleet</Th><Th right>Catalogue fit</Th><Th>Trigger</Th><Th>Suggested first call</Th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {PROSPECTS.map((p) => (
                <tr key={p.name} className="hover:bg-ink-25">
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={p.name} size={26} square />
                      <span><span className="block font-medium text-ink-900">{p.name}</span><span className="block text-[11px] text-ink-400">{p.place} · {p.type}</span></span>
                    </span>
                  </Td>
                  <Td><span className="flex flex-wrap gap-1">{p.fleet.map((f) => <Badge key={f}>{f}</Badge>)}</span></Td>
                  <Td right className="mono text-ink-900">{p.fit.toLocaleString()} parts</Td>
                  <Td>
                    {p.when
                      ? <><span className="block text-[12px] text-ink-800">{p.trigger}</span><span className="block text-[10.5px] text-ink-400">{p.when}</span></>
                      : <span className="text-ink-400">{p.trigger}</span>}
                  </Td>
                  <Td className="text-ink-700">{p.call}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-500">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-caution-600" />
        Field’s own customer list decides who is a prospect and who is already a customer. Until it is connected, every name here is invented.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- modal */

/** Signed-in users are the synthetic staff; no real person's name goes on an invented screen. */
const SCREENS: Record<ModuleId, { module: CrmModule; user: { name: string; role: string }; render: () => React.ReactNode; title: string }> = {
  pipeline: { module: 'Home', user: { name: 'Alison Reid', role: 'Commercial Director' }, render: () => <PipelineScreen />, title: 'One pipeline across seven companies' },
  recall: { module: 'Service', user: { name: 'Nadia Hassan', role: 'Customer Support Lead' }, render: () => <RecallScreen />, title: 'Calibration and recertification recall' },
  prospects: { module: 'Prospects', user: { name: 'Priya Raman', role: 'Head of Sales' }, render: () => <ProspectsScreen />, title: 'Who to call before Pensacola opens' },
};

export function ModuleDialog({ id, onClose }: { id: ModuleId; onClose: () => void }) {
  const s = SCREENS[id];
  useEffect(() => {
    document.body.dataset.dialog = 'open';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { delete document.body.dataset.dialog; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-signal-900/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={s.title} onClick={(e) => e.stopPropagation()} className="step-in max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-t-2xl bg-ink-50 p-3 sm:rounded-2xl sm:p-4">
        <div className="mb-3 flex items-start justify-between gap-4 px-1">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-signal-500">A screen, not a system</p>
            <h2 className="font-display text-[20px] font-light tracking-[-0.02em] text-ink-950">{s.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-white hover:text-ink-900"><X className="h-4 w-4" /></button>
        </div>
        <CrmFrame module={s.module} user={s.user}>{s.render()}</CrmFrame>
      </div>
    </div>
  );
}
