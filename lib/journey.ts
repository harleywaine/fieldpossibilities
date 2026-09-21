/**
 * The simulation: a request the viewer types as Field's customer, followed
 * through Field's own systems.
 *
 * The first screens are the customer's side (a mock of Field's website); the
 * rest are Field's side (a mock CRM). Steps marked `human` stop and wait for the
 * viewer's decision — the machine prepares and the person decides. Where a step
 * has a people-time cost it points at a row in the metrics table, so the ledger
 * is computed, not written.
 */

export type StepId =
  | 'start' | 'request' | 'parts' | 'inbox' | 'account' | 'check'
  | 'review' | 'supplier' | 'approval' | 'manufacture' | 'summary';

export type Side = 'customer' | 'field';

export interface JourneyStep {
  id: StepId;
  rail: string;
  side?: Side;
  human?: boolean;
  metric?: string;
  ledgerLabel?: string;
}

export const STEPS: JourneyStep[] = [
  { id: 'start', rail: 'Start' },
  { id: 'request', rail: 'Your request', side: 'customer' },
  { id: 'parts', rail: 'Parts and quote', side: 'customer' },
  { id: 'inbox', rail: 'Inbox', side: 'field', metric: 'Customer enquiry handling', ledgerLabel: 'Logging the enquiry' },
  { id: 'account', rail: 'Account', side: 'field', metric: 'Internal knowledge retrieval', ledgerLabel: 'Researching the account' },
  { id: 'check', rail: 'Line check', side: 'field', metric: 'RFQ preparation', ledgerLabel: 'Checking every line' },
  { id: 'review', rail: 'Engineering', side: 'field', human: true, metric: 'Technical applicability check', ledgerLabel: 'Technical review' },
  { id: 'supplier', rail: 'Procurement', side: 'field', human: true, metric: 'Supplier follow-up', ledgerLabel: 'Confirming lead times' },
  { id: 'approval', rail: 'Quote sign-off', side: 'field', human: true },
  { id: 'manufacture', rail: 'Order', side: 'field', human: true },
  { id: 'summary', rail: 'Summary' },
];

export const stepIndex = (id: StepId) => STEPS.findIndex((s) => s.id === id);

/** Who the viewer is signed in as on each Field screen. Synthetic employees. */
export const PERSONAS: Partial<Record<StepId, { name: string; role: string }>> = {
  review: { name: 'Hannah Lund', role: 'Tooling Engineer' },
  supplier: { name: 'Robert Ellis', role: 'Supplier Manager' },
  approval: { name: 'Alison Reid', role: 'Commercial Director' },
  manufacture: { name: 'Michael Byrne', role: 'Operations Manager' },
};

export interface StepMetric { before: number; after: number; volume: number }

/** Used only if the synthetic dataset hasn't been generated. */
export const FALLBACK_METRICS: Record<string, StepMetric> = {
  'Customer enquiry handling': { before: 18, after: 6, volume: 4200 },
  'Internal knowledge retrieval': { before: 22, after: 5, volume: 2600 },
  'RFQ preparation': { before: 55, after: 12, volume: 1900 },
  'Technical applicability check': { before: 35, after: 20, volume: 900 },
  'Supplier follow-up': { before: 25, after: 9, volume: 1800 },
};

export const EXAMPLE_REQUESTS = [
  "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine thrust reverser maintenance. We need delivery within 10 weeks.",
  'Handling equipment for a 737-800 horizontal stabilizer, needed within 8 weeks.',
  'Landing gear jacking equipment for a 747 heavy check.',
];

export function formatMinutes(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export const weeks = (days: number) => Math.round((days / 7) * 10) / 10;

/** "3 days" under a fortnight, otherwise "4.3 weeks" (or "4.3 wks" when short). */
export function duration(days: number, short = false): string {
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`;
  return `${weeks(days)} ${short ? 'wks' : 'weeks'}`;
}

export function gbp(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1000) return `£${Math.round(n / 1000)}k`;
  return `£${n}`;
}

export function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/**
 * A supplier's reply, SIMULATED. Where the catalogue publishes a lead time the
 * reply confirms it; otherwise a stable figure between five and thirteen weeks
 * is derived from the part number, so the same request always replays the same
 * way. Always labelled as simulated wherever it is shown.
 */
export function simulatedLeadDays(partNumber: string | null, catalogueDays: number | null): number {
  if (catalogueDays !== null) return catalogueDays;
  let h = 2166136261;
  for (const ch of partNumber ?? 'x') h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (5 + (Math.abs(h) % 9)) * 7;
}

/** Which synthetic supplier Procurement would ask, from the kind of item. */
export function supplierFor(name: string): string {
  const n = name.toLowerCase();
  if (/sling|hoist|lift/.test(n)) return 'Baltic Lifting Systems';
  if (/stand|frame|dolly|trolley|cradle/.test(n)) return 'Northgate Fabrication';
  if (/cover|plug|protect/.test(n)) return 'Provence Composites';
  if (/test|gauge|measur/.test(n)) return 'Vector Test Systems';
  if (/jack/.test(n)) return 'Kite Ground Support';
  if (/genx|trent|cfm|thrust reverser|engine/.test(n)) return 'Meridian Aerospace Tooling';
  return 'Halden Precision Works';
}

/** "BOEING 787" → "Boeing 787"; anything already mixed-case is left alone. */
export function aircraftLabel(s: string | null): string | null {
  if (!s || s !== s.toUpperCase()) return s;
  return s.split(' ').map((w) => (/\d/.test(w) ? w : w[0] + w.slice(1).toLowerCase())).join(' ');
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Match a typed company name to an account, loosely: "singapore aero" finds Singapore Aero MRO. */
export function matchAccount<T extends { name: string }>(typed: string, accounts: T[]): T | null {
  const t = norm(typed);
  if (t.length < 3) return null;
  return accounts.find((a) => norm(a.name) === t)
    ?? accounts.find((a) => t.length >= 5 && norm(a.name).startsWith(t))
    ?? accounts.find((a) => t.includes(norm(a.name)))
    ?? null;
}
