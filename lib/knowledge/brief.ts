/**
 * Enquiry Intelligence (brief §21, §22, §50).
 *
 * Synthesises facts across several retrieved documents into a structured brief.
 * Every field carries its sources, so the reader can always separate a SOURCE
 * FACT from an AI INTERPRETATION. Conflicts and stale documents are surfaced
 * rather than silently resolved.
 */
import { demoDb } from '../db/demo.ts';
import { retrieveKnowledge, type KnowledgeResult, type RetrievedChunk } from './retrieval.ts';

export interface Citation {
  documentId: string;
  title: string;
  path: string;
  documentType: string;
  updatedAt: string;
  excerpt: string;
  staleMonths?: number | null;
}

export interface BriefField {
  label: string;
  value: string;
  /** Derived by the model from the sources, rather than quoted from one. */
  interpretation?: boolean;
  citations: Citation[];
  /** Present when sources disagree (§50). */
  conflict?: { summary: string; positions: Array<{ value: string; citation: Citation }> };
  /** Present when the supporting document is old enough to warrant checking. */
  ageWarning?: string;
}

export interface EnquiryBrief {
  customerName: string | null;
  requirement: string | null;
  fields: BriefField[];
  openQuestions: string[];
  recommendedNextStep: string;
  retrieval: KnowledgeResult;
}

const MONTH_MS = 30 * 86_400_000;

function toCitation(c: RetrievedChunk): Citation {
  const d = c.document;
  return {
    documentId: d.document_id, title: d.title, path: d.path,
    documentType: d.document_type, updatedAt: d.updated_at,
    excerpt: c.text.split('\n').filter(Boolean).slice(1, 5).join(' ').slice(0, 260),
    staleMonths: d.stale_months,
  };
}

function ageMonths(iso: string): number {
  return Math.round((Date.now() - Date.parse(iso)) / MONTH_MS);
}

export function buildEnquiryBrief(question: string): EnquiryBrief {
  const retrieval = retrieveKnowledge(question, 14);
  const fields: BriefField[] = [];
  const openQuestions: string[] = [];

  const customerId = retrieval.filters.customerId ?? null;
  const customer = customerId
    ? (demoDb().prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any)
    : null;

  // One citation per document: repeating the same file twice reads as two
  // independent corroborating sources when it is only one.
  const cite = (predicate: (c: RetrievedChunk) => boolean, max = 2): Citation[] => {
    const seenDocs = new Set<string>();
    const out: Citation[] = [];
    for (const c of retrieval.chunks) {
      if (!predicate(c) || seenDocs.has(c.documentId)) continue;
      seenDocs.add(c.documentId);
      out.push(toCitation(c));
      if (out.length >= max) break;
    }
    return out;
  };

  // ---- Customer ----------------------------------------------------------
  if (customer) {
    const owner = demoDb().prepare('SELECT * FROM employees WHERE id = ?').get(customer.account_owner_id) as any;
    fields.push({
      label: 'Customer', value: `${customer.name} — ${customer.country} (${customer.type})`,
      citations: cite((c) => c.document.document_type === 'customer-profile' && c.document.customer_id === customerId),
    });
    if (owner) {
      fields.push({
        label: 'Internal owner', value: `${owner.name}, ${owner.role}`,
        citations: cite((c) => c.document.customer_id === customerId),
      });
    }
  }

  // ---- Requirement -------------------------------------------------------
  const openRfq = customerId
    ? (demoDb().prepare(
        `SELECT * FROM rfqs WHERE customer_id = ? AND status = 'open'
         ORDER BY received_at DESC LIMIT 1`).get(customerId) as any)
    : null;

  let requirement: string | null = null;
  if (openRfq) {
    requirement = [openRfq.aircraft, openRfq.engine, openRfq.application]
      .filter(Boolean).join(' / ');
    fields.push({
      label: 'Requirement',
      value: `${requirement} — ${openRfq.programme.toLowerCase()}`,
      citations: cite((c) => c.document.related_rfq_id === openRfq.id),
    });
    if (openRfq.required_delivery_weeks) {
      fields.push({
        label: 'Required delivery',
        value: `${openRfq.required_delivery_weeks} weeks`,
        citations: cite((c) => c.document.related_rfq_id === openRfq.id),
      });
    }
  }

  // ---- Previous interactions --------------------------------------------
  if (customerId) {
    const prior = demoDb().prepare(
      `SELECT * FROM rfqs WHERE customer_id = ? AND status != 'open' ORDER BY received_at DESC`
    ).all(customerId) as any[];
    if (prior.length) {
      fields.push({
        label: 'Previous interactions',
        value: `${prior.length} related historical ${prior.length === 1 ? 'enquiry' : 'enquiries'} — ` +
               prior.map((p) => `${p.reference} (${p.status})`).join(', '),
        citations: cite((c) => c.document.document_type === 'account-history' || c.document.document_type === 'rfq'),
      });
    }

    // ---- Previous quote --------------------------------------------------
    const quote = demoDb().prepare(
      `SELECT q.* FROM quotes q WHERE q.customer_id = ? ORDER BY q.issued_at DESC LIMIT 1`
    ).get(customerId) as any;
    if (quote) {
      fields.push({
        label: 'Previous quote',
        value: `£${Number(quote.value_gbp).toLocaleString()} (${quote.reference}, ${quote.status})`,
        citations: cite((c) => c.document.related_quote_id === quote.id ||
                               c.document.document_type === 'account-history'),
      });
      fields.push({
        label: 'Historical lead time quoted',
        value: `${quote.lead_time_weeks} weeks`,
        citations: cite((c) => c.document.related_quote_id === quote.id),
      });
    }
  }

  // ---- Supplier position, including any conflict (§50) -------------------
  const supplierChunks = retrieval.chunks.filter(
    (c) => c.document.document_type === 'supplier-correspondence' || c.document.supplier_id);
  const conflictPair = findConflict(retrieval.chunks);

  if (conflictPair) {
    const [a, b] = conflictPair;
    const newer = Date.parse(a.document.updated_at) >= Date.parse(b.document.updated_at) ? a : b;
    const older = newer === a ? b : a;
    fields.push({
      label: 'Latest supplier information',
      value: `${extractLeadTime(newer.text) ?? 'see sources'} (most recent source)`,
      citations: [toCitation(newer), toCitation(older)],
      conflict: {
        summary:
          'Sources disagree on supplier lead time. The most recent source supersedes the older one, ' +
          'but the position should be confirmed with the supplier before it is used.',
        positions: [
          { value: `${extractLeadTime(newer.text) ?? 'unstated'} — ${newer.document.updated_at.slice(0, 10)}`, citation: toCitation(newer) },
          { value: `${extractLeadTime(older.text) ?? 'unstated'} — ${older.document.updated_at.slice(0, 10)}`, citation: toCitation(older) },
        ],
      },
      ageWarning: older.document.stale_months
        ? `The conflicting source is around ${older.document.stale_months} months old and is marked superseded.`
        : undefined,
    });
    openQuestions.push('Which supplier lead time is currently valid? Confirm in writing before quoting a delivery position.');
  } else {
    // Only supplier-sourced documents may state a supplier lead time. A figure
    // lifted from an old quotation is a historical record, not current supply.
    const supplierSourced = supplierChunks
      .filter((c) => c.document.document_type === 'supplier-correspondence' || c.document.document_type === 'email')
      .sort((a, z) => Date.parse(z.document.updated_at) - Date.parse(a.document.updated_at));
    const withLead = supplierSourced.find((c) => extractLeadTime(c.text));
    if (withLead) {
      fields.push({
        label: 'Latest supplier information',
        value: `${extractLeadTime(withLead.text)} — ${withLead.document.updated_at.slice(0, 10)}`,
        citations: [toCitation(withLead)],
      });
    } else {
      fields.push({
        label: 'Latest supplier information',
        value: 'No current supplier lead time found in the retrieved records.',
        citations: [],
      });
      openQuestions.push('Obtain a current lead time from the supplier before offering a delivery position.');
    }
  }

  // ---- Technical caveats -------------------------------------------------
  const tech = retrieval.chunks.find((c) => c.document.document_type === 'technical-note');
  if (tech) {
    fields.push({
      label: 'Technical position', interpretation: true,
      value:
        'Catalogue applicability is recorded at aircraft model level only. Variant-level ' +
        'suitability is not established by the available records and requires Engineering confirmation.',
      citations: [toCitation(tech)],
    });
    openQuestions.push('Has Engineering confirmed applicability for the specific aircraft variant?');
  }

  // ---- Potential issue, derived across documents -------------------------
  const history = retrieval.chunks.find((c) => c.document.document_type === 'account-history');
  if (history && /delivery|lead time|slot/i.test(history.text)) {
    fields.push({
      label: 'Potential issue', interpretation: true,
      value:
        'Account history indicates delivery lead time has been the recurring point of friction ' +
        'with this customer, including a previous loss on that basis.',
      citations: [toCitation(history)],
    });
  }

  // ---- Ageing warnings ---------------------------------------------------
  for (const f of fields) {
    if (f.ageWarning) continue;
    const oldest = f.citations.find((c) => ageMonths(c.updatedAt) >= 12);
    if (oldest) f.ageWarning = `Supporting information is around ${ageMonths(oldest.updatedAt)} months old and should be verified.`;
  }

  if (!openQuestions.length) {
    openQuestions.push('Confirm current availability and delivery before responding to the customer.');
  }

  return {
    customerName: customer?.name ?? null,
    requirement,
    fields,
    openQuestions,
    recommendedNextStep:
      'Confirm current supplier availability and delivery, and obtain Engineering confirmation on ' +
      'variant applicability, before issuing a response or a delivery position.',
    retrieval,
  };
}

/** Finds two retrieved chunks whose documents are marked as conflicting. */
function findConflict(chunks: RetrievedChunk[]): [RetrievedChunk, RetrievedChunk] | null {
  for (const a of chunks) {
    const target = a.document.conflicts_with;
    if (!target) continue;
    const b = chunks.find((c) => c.document.document_id === target);
    if (b) return [a, b];
  }
  return null;
}

function extractLeadTime(text: string): string | null {
  const m = text.match(/(\d+\s*[–-]\s*\d+|\d+)\s*weeks?/i);
  return m ? `${m[1].replace(/\s*[–-]\s*/, '–')} weeks` : null;
}
