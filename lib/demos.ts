/**
 * The four demonstrations, described literally: AI applied to a named process.
 * No metaphor, no framing — each entry says what it does, what it runs on, how
 * hard it is to build, and what it does to the time the process takes.
 */

export interface Demo {
  slug: string;
  href: string;
  /** Literal title — "AI applied to <process>". */
  title: string;
  short: string;
  /** One unambiguous sentence about what happens. */
  what: string;
  dataKind: 'real' | 'synthetic' | 'mixed';
  /** 1–4 build-complexity scale, with its plain label. */
  complexity: 1 | 2 | 3 | 4;
  complexityLabel: string;
  /** Row in the metrics table this demo's efficiency figure comes from. */
  metricProcess: string;
  /** Fallbacks if the synthetic dataset isn't generated. */
  fallbackMinutes: { before: number; after: number };
}

export const DEMOS: Demo[] = [
  {
    slug: 'product-search',
    href: '/demo/product-search',
    title: 'AI applied to product search',
    short: 'Product search',
    what: 'A customer describes what they need in plain English. The system finds the right tooling in the catalogue and shows the evidence for every match.',
    dataKind: 'real',
    complexity: 1,
    complexityLabel: 'Low',
    metricProcess: 'Customer enquiry handling',
    fallbackMinutes: { before: 18, after: 6 },
  },
  {
    slug: 'enquiry-research',
    href: '/demo/enquiry-research',
    title: 'AI applied to enquiry research',
    short: 'Enquiry research',
    what: 'Before anyone replies to a customer, the system reads the relevant internal records — history, quotes, correspondence — and assembles the brief.',
    dataKind: 'synthetic',
    complexity: 2,
    complexityLabel: 'Medium',
    metricProcess: 'Internal knowledge retrieval',
    fallbackMinutes: { before: 22, after: 5 },
  },
  {
    slug: 'rfq-processing',
    href: '/demo/rfq-processing',
    title: 'AI applied to RFQ processing',
    short: 'RFQ processing',
    what: 'An incoming RFQ is read, every line item matched against the catalogue, and the items needing judgement routed to people with the reason attached.',
    dataKind: 'mixed',
    complexity: 3,
    complexityLabel: 'Medium–high',
    metricProcess: 'RFQ preparation',
    fallbackMinutes: { before: 55, after: 12 },
  },
  {
    slug: 'operations-analysis',
    href: '/demo/operations-analysis',
    title: 'AI applied to operations analysis',
    short: 'Operations analysis',
    what: 'Process volumes and times run through an adjustable model that shows where the hours go and what applying AI to each process is worth.',
    dataKind: 'synthetic',
    complexity: 4,
    complexityLabel: 'High',
    metricProcess: 'Reporting and admin',
    fallbackMinutes: { before: 90, after: 35 },
  },
];

export const demoBySlug = (slug: string) => DEMOS.find((d) => d.slug === slug);

/** The query the product-search demo runs by itself. Real, against real data. */
export const GOLDEN_QUERY =
  "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine " +
  'thrust reverser maintenance. We need delivery within 10 weeks.';

export const GOLDEN_ENQUIRY =
  "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx " +
  'thrust reverser tooling. Tell me everything I need to know before I respond.';
