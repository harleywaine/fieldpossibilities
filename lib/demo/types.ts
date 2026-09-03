/**
 * Synthetic internal business data (brief §51, §54).
 *
 * Everything typed here is FABRICATED for demonstration. It models how Field's
 * internal records might look; it is never presented as real Field data. The
 * only real data in this application is the public product catalogue.
 */

export type DocumentType =
  | 'customer-profile' | 'rfq' | 'quote' | 'email' | 'technical-note'
  | 'supplier-correspondence' | 'meeting-notes' | 'process' | 'account-history';

export type Department =
  | 'Sales' | 'Commercial' | 'Engineering' | 'Operations' | 'Procurement' | 'Management';

export interface Customer {
  id: string;
  name: string;
  country: string;
  region: string;
  type: string;
  fleet: string[];
  accountOwnerId: string;
  since: string;
  annualSpendGbp: number;
  paymentTerms: string;
  notes: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: Department;
  email: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  country: string;
  /** Working assumption held internally — may be stale relative to correspondence. */
  standardLeadTimeWeeks: number;
  reliabilityPct: number;
  notes: string;
}

export interface RfqLineItem {
  line: number;
  requestedPart: string | null;
  description: string;
  quantity: number;
  /** Catalogue id resolved by the matcher at runtime, not pre-baked. */
  notes: string | null;
}

export interface Rfq {
  id: string;
  reference: string;
  customerId: string;
  ownerId: string;
  receivedAt: string;
  aircraft: string;
  engine: string | null;
  application: string | null;
  programme: string;
  requiredDeliveryWeeks: number | null;
  status: 'won' | 'lost' | 'open' | 'quoted';
  lineItems: RfqLineItem[];
  summary: string;
}

export interface Quote {
  id: string;
  reference: string;
  rfqId: string;
  customerId: string;
  ownerId: string;
  issuedAt: string;
  valueGbp: number;
  currency: 'GBP';
  leadTimeWeeks: number;
  status: 'accepted' | 'declined' | 'expired' | 'pending';
  lineCount: number;
  notes: string;
}

/** A retrievable internal document with full provenance metadata (§51). */
export interface DemoDocument {
  documentId: string;
  title: string;
  documentType: DocumentType;
  department: Department;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  relatedRfqId: string | null;
  relatedQuoteId: string | null;
  relatedParts: string[];
  supplierId: string | null;
  status: 'current' | 'superseded' | 'draft';
  /** Filesystem-style path, mirroring how these would live on a share. */
  path: string;
  body: string;
  /** Set when the document is deliberately stale, to demo the ageing warning (§50). */
  staleMonths?: number;
  /** Marks documents that deliberately conflict with another source (§50). */
  conflictsWith?: string;
}

export interface OperationalMetric {
  process: string;
  currentMinutes: number;
  aiAssistedMinutes: number;
  annualVolume: number;
  affectedEmployees: number;
  complexity: 'Low' | 'Medium' | 'Medium–High' | 'High';
  department: Department;
}

export interface RoiAssumptions {
  loadedHourlyCostGbp: number;
  workingWeeksPerYear: number;
  implementationCostGbp: number;
  adoptionRatePct: number;
}

export interface DemoDataset {
  generatedAt: string;
  seed: number;
  customers: Customer[];
  employees: Employee[];
  suppliers: Supplier[];
  rfqs: Rfq[];
  quotes: Quote[];
  documents: DemoDocument[];
  metrics: OperationalMetric[];
  roi: RoiAssumptions;
}
