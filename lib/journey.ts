/**
 * One enquiry, followed from first question to finished tool.
 *
 * Each step names a real stage of Field's process, literally. Where a step has
 * a people-time cost, it points at a row in the metrics table so the ledger at
 * the bottom of the screen is computed, not written.
 */

export type StepId =
  | 'start' | 'search' | 'enquiry' | 'research' | 'quote'
  | 'review' | 'supplier' | 'manufacture' | 'summary';

export interface JourneyStep {
  id: StepId;
  /** Label on the navigation rail. */
  rail: string;
  /** Row in the metrics table this step's time comes from, if it has one. */
  metric?: string;
  /** How the step reads in the time ledger. */
  ledgerLabel?: string;
  data?: 'real' | 'synthetic' | 'mixed';
}

export const STEPS: JourneyStep[] = [
  { id: 'start', rail: 'Start' },
  { id: 'search', rail: 'Customer search', metric: 'Customer enquiry handling', ledgerLabel: 'Finding the product', data: 'real' },
  { id: 'enquiry', rail: 'Enquiry', data: 'synthetic' },
  { id: 'research', rail: 'Research', metric: 'Internal knowledge retrieval', ledgerLabel: 'Researching the account', data: 'synthetic' },
  { id: 'quote', rail: 'Quotation', metric: 'RFQ preparation', ledgerLabel: 'Preparing the quote', data: 'mixed' },
  { id: 'review', rail: 'Human review', metric: 'Technical applicability check', ledgerLabel: 'Technical review', data: 'mixed' },
  { id: 'supplier', rail: 'Supplier', metric: 'Supplier follow-up', ledgerLabel: 'Confirming the lead time', data: 'synthetic' },
  { id: 'manufacture', rail: 'Manufacture', data: 'synthetic' },
  { id: 'summary', rail: 'Summary' },
];

export interface StepMetric { before: number; after: number; volume: number }

/** Used only if the synthetic dataset hasn't been generated. */
export const FALLBACK_METRICS: Record<string, StepMetric> = {
  'Customer enquiry handling': { before: 18, after: 6, volume: 4200 },
  'Internal knowledge retrieval': { before: 22, after: 5, volume: 2600 },
  'RFQ preparation': { before: 55, after: 12, volume: 1900 },
  'Technical applicability check': { before: 35, after: 20, volume: 900 },
  'Supplier follow-up': { before: 25, after: 9, volume: 1800 },
};

/** The customer's question — asked for real, against the real catalogue. */
export const CUSTOMER_QUERY =
  'Tooling for Boeing 787 GEnx thrust reverser maintenance, needed within 10 weeks';

export const RESEARCH_QUESTION =
  "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx " +
  'thrust reverser tooling. Tell me everything I need to know before I respond.';

export function formatMinutes(total: number): string {
  const m = Math.round(total);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
