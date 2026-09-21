/**
 * What Field's CRM would show about an account — built from the synthetic
 * dataset (customers, RFQs, quotes, correspondence), plus a short authored list
 * of service cases per account. Nothing here is real Field data, and every
 * screen that shows it says so.
 */
import { demoDb } from '../db/demo.ts';

export interface CrmJob {
  reference: string;
  date: string;
  aircraft: string | null;
  application: string | null;
  status: 'won' | 'lost' | 'quoted' | 'open';
  valueGbp: number | null;
  quotedWeeks: number | null;
  requiredWeeks: number | null;
}

export interface CrmCase {
  id: string;
  opened: string;
  kind: 'Complaint' | 'Query';
  subject: string;
  detail: string;
  status: 'Open' | 'Resolved';
}

export interface CrmActivity {
  date: string;
  kind: string;
  title: string;
  author: string | null;
}

export interface CrmAccount {
  id: string;
  name: string;
  country: string;
  region: string;
  type: string;
  fleet: string[];
  since: string;
  paymentTerms: string;
  annualSpendGbp: number;
  notes: string;
  owner: { name: string; role: string; email: string } | null;
  stats: { wonGbp: number; pipelineGbp: number; winRatePct: number | null; enquiries: number };
  jobs: CrmJob[];
  cases: CrmCase[];
  activity: CrmActivity[];
}

export interface CrmInboxItem {
  reference: string;
  customer: string;
  date: string;
  subject: string;
  status: string;
  owner: string | null;
}

/**
 * Service cases, authored to agree with the rest of the synthetic record —
 * the delivery the Singapore account nearly walked over, the supplier with
 * "occasional quality escapes", the price-sensitive newer account.
 */
const CASES: Record<string, CrmCase[]> = {
  'CUST-001': [
    { id: 'CS-2291', opened: '2026-08-20', kind: 'Query', status: 'Open', subject: 'Hold open equipment — which revision is current?', detail: 'Customer quotes a later revision than the one supplied under QT-09841. Engineering to confirm.' },
    { id: 'CS-2107', opened: '2025-09-02', kind: 'Query', status: 'Resolved', subject: 'Certificate of conformity missing from a delivery', detail: 'Sling equipment arrived without its certificate. Copy sent the same day.' },
    { id: 'CS-1864', opened: '2024-12-09', kind: 'Complaint', status: 'Resolved', subject: 'Quoted lead time too long — 777 landing gear tooling', detail: 'RFQ-09102 lost on delivery. Customer told the account owner lead time decides their orders.' },
  ],
  'CUST-002': [
    { id: 'CS-2052', opened: '2025-11-18', kind: 'Complaint', status: 'Resolved', subject: 'Proof-load certificate out of date on arrival', detail: 'Sling re-certified by Lakeside Calibration and returned in nine days.' },
  ],
  'CUST-003': [
    { id: 'CS-2240', opened: '2026-07-14', kind: 'Query', status: 'Open', subject: 'Can shipments to Dubai be consolidated?', detail: 'Customer asks for one monthly consignment instead of part shipments.' },
    { id: 'CS-1977', opened: '2025-06-03', kind: 'Complaint', status: 'Resolved', subject: 'Stand assembly damaged in transit', detail: 'Crate failed on the forklift. Replacement frame shipped; packaging spec changed.' },
  ],
  'CUST-004': [
    { id: 'CS-2011', opened: '2025-09-26', kind: 'Complaint', status: 'Resolved', subject: 'Part shipment sent without notice', detail: 'Two of five items shipped early with no advice note. Process now sends one.' },
  ],
  'CUST-005': [],
  'CUST-006': [
    { id: 'CS-2263', opened: '2026-08-02', kind: 'Query', status: 'Open', subject: 'Tooling list for first 787 base check', detail: 'Customer moving into base checks and wants a recommended starter list.' },
  ],
  'CUST-007': [
    { id: 'CS-2138', opened: '2026-01-21', kind: 'Complaint', status: 'Resolved', subject: 'Fixture out of tolerance on inspection', detail: 'Traced to a Cordoba Metalworks batch. Re-made by Halden Precision Works.' },
  ],
  'CUST-008': [
    { id: 'CS-2279', opened: '2026-08-11', kind: 'Complaint', status: 'Open', subject: 'Price up on the same item since last quote', detail: 'Customer compares QT-9111 with an earlier quote and asks for the difference to be explained.' },
  ],
};

const day = (iso: string) => iso.slice(0, 10);

export function listAccounts(): CrmAccount[] {
  const db = demoDb();
  const customers = db.prepare(`
    SELECT c.*, e.name AS owner_name, e.role AS owner_role, e.email AS owner_email
    FROM customers c LEFT JOIN employees e ON e.id = c.account_owner_id ORDER BY c.id
  `).all() as any[];
  const rfqs = db.prepare(`
    SELECT r.*, q.value_gbp, q.lead_time_weeks, q.status AS quote_status
    FROM rfqs r LEFT JOIN quotes q ON q.rfq_id = r.id
    ORDER BY r.received_at DESC
  `).all() as any[];
  const docs = db.prepare(`
    SELECT customer_id, created_at, document_type, title, author_name FROM documents
    WHERE customer_id IS NOT NULL AND document_type IN ('email', 'meeting-notes', 'quote', 'account-history')
    ORDER BY created_at DESC
  `).all() as any[];

  return customers.map((c) => {
    const own = rfqs.filter((r) => r.customer_id === c.id);
    const jobs: CrmJob[] = own.map((r) => ({
      reference: r.reference,
      date: day(r.received_at),
      aircraft: r.aircraft,
      application: r.application,
      status: r.status,
      valueGbp: r.value_gbp ?? null,
      quotedWeeks: r.lead_time_weeks ?? null,
      requiredWeeks: r.required_delivery_weeks ?? null,
    }));
    const won = own.filter((r) => r.status === 'won');
    const lost = own.filter((r) => r.status === 'lost');
    const decided = won.length + lost.length;
    return {
      id: c.id,
      name: c.name,
      country: c.country,
      region: c.region,
      type: c.type,
      fleet: JSON.parse(c.fleet ?? '[]'),
      since: c.since,
      paymentTerms: c.payment_terms,
      annualSpendGbp: c.annual_spend_gbp,
      notes: c.notes,
      owner: c.owner_name ? { name: c.owner_name, role: c.owner_role, email: c.owner_email } : null,
      stats: {
        wonGbp: won.reduce((a, r) => a + (r.value_gbp ?? 0), 0),
        pipelineGbp: own.filter((r) => r.quote_status === 'pending').reduce((a, r) => a + (r.value_gbp ?? 0), 0),
        winRatePct: decided ? Math.round((won.length / decided) * 100) : null,
        enquiries: own.length,
      },
      jobs: jobs.slice(0, 6),
      cases: CASES[c.id] ?? [],
      activity: docs
        .filter((d) => d.customer_id === c.id)
        .slice(0, 5)
        .map((d) => ({ date: day(d.created_at), kind: d.document_type, title: d.title, author: d.author_name })),
    };
  });
}

/** The enquiries already in Field's inbox when the viewer's one arrives. */
export function listInbox(limit = 6): CrmInboxItem[] {
  const rows = demoDb().prepare(`
    SELECT r.reference, r.received_at, r.aircraft, r.application, r.status, c.name AS customer, e.name AS owner
    FROM rfqs r JOIN customers c ON c.id = r.customer_id LEFT JOIN employees e ON e.id = r.owner_id
    WHERE r.status IN ('open', 'quoted')
    ORDER BY r.received_at DESC LIMIT ?
  `).all(limit) as any[];
  return rows.map((r) => ({
    reference: r.reference,
    customer: r.customer,
    date: day(r.received_at),
    subject: [r.aircraft, r.application?.toLowerCase(), 'tooling'].filter(Boolean).join(' '),
    status: r.status === 'open' ? 'Open' : 'Quoted',
    owner: r.owner ?? null,
  }));
}
