/**
 * The simulation: a request the viewer types, followed through Field's process.
 *
 * Steps marked `human` stop and wait for the viewer's decision — the point of
 * the exercise is that the machine prepares and the person decides. Where a
 * step has a people-time cost it points at a row in the metrics table, so the
 * ledger is computed, not written.
 */

export type StepId =
  | 'start' | 'request' | 'rfq' | 'research' | 'check'
  | 'review' | 'supplier' | 'approval' | 'manufacture' | 'summary';

export interface JourneyStep {
  id: StepId;
  rail: string;
  human?: boolean;
  metric?: string;
  ledgerLabel?: string;
  data?: 'real' | 'synthetic' | 'mixed' | 'simulated';
}

export const STEPS: JourneyStep[] = [
  { id: 'start', rail: 'Start' },
  { id: 'request', rail: 'Customer request', data: 'real' },
  { id: 'rfq', rail: 'Quote request', metric: 'Customer enquiry handling', ledgerLabel: 'Turning the request into an RFQ', data: 'mixed' },
  { id: 'research', rail: 'Research', metric: 'Internal knowledge retrieval', ledgerLabel: 'Researching the account', data: 'synthetic' },
  { id: 'check', rail: 'Line check', metric: 'RFQ preparation', ledgerLabel: 'Checking every line', data: 'real' },
  { id: 'review', rail: 'Engineer review', human: true, metric: 'Technical applicability check', ledgerLabel: 'Technical review', data: 'real' },
  { id: 'supplier', rail: 'Supplier', human: true, metric: 'Supplier follow-up', ledgerLabel: 'Confirming lead times', data: 'simulated' },
  { id: 'approval', rail: 'Quote approval', human: true, data: 'simulated' },
  { id: 'manufacture', rail: 'Manufacture', human: true, data: 'simulated' },
  { id: 'summary', rail: 'Summary' },
];

export const stepIndex = (id: StepId) => STEPS.findIndex((s) => s.id === id);

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
