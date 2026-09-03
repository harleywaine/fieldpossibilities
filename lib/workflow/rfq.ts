/**
 * RFQ workflow automation (brief §26–§33).
 *
 * Real processing, not a cosmetic animation: each requested line item is
 * matched against the REAL catalogue, checked against synthetic account
 * history, and classified. Items the system cannot settle are routed to a
 * human rather than guessed — that exception path is the point of the demo.
 */
import { productByPartNumber, getProducts } from '../db/client.ts';
import { retrieve } from '../ai/retrieval.ts';
import { demoDb } from '../db/demo.ts';
import type { Product } from '../catalogue/types.ts';

export type LineStatus = 'matched' | 'review' | 'unmatched';

export interface MatchedLine {
  line: number;
  requestedPart: string | null;
  description: string;
  quantity: number;
  status: LineStatus;
  product: Product | null;
  /** Why this line landed where it did — shown in the exception queue. */
  reason: string;
  /** Set when a human must decide something the system will not decide alone. */
  reviewReason: string | null;
  previouslySupplied: boolean;
  previousQuoteRef: string | null;
  leadTimeDays: number | null;
  confidence: 'exact' | 'strong' | 'possible' | 'none';
}

export interface ExtractedRfq {
  reference: string;
  customerName: string;
  customerId: string;
  ownerName: string;
  receivedAt: string;
  aircraft: string;
  engine: string | null;
  application: string | null;
  programme: string;
  requiredDeliveryWeeks: number | null;
  lineCount: number;
}

export interface WorkPackage {
  extracted: ExtractedRfq;
  lines: MatchedLine[];
  counts: { total: number; matched: number; review: number; unmatched: number };
  history: { priorRfqs: number; priorQuotes: number; lastQuoteValueGbp: number | null };
  supplierFollowUps: number;
  recommendedAction: string;
  /** Actions this workflow will NOT take without a human (brief §33). */
  humanGates: string[];
  durationMs: number;
  stages: Array<{ key: string; label: string; detail: string; count?: number }>;
}

export function loadRfq(reference: string): ExtractedRfq & { lineItems: any[] } {
  const row = demoDb().prepare('SELECT * FROM rfqs WHERE reference = ?').get(reference) as any;
  if (!row) throw new Error(`RFQ ${reference} not found in the synthetic dataset.`);
  const cust = demoDb().prepare('SELECT * FROM customers WHERE id = ?').get(row.customer_id) as any;
  const owner = demoDb().prepare('SELECT * FROM employees WHERE id = ?').get(row.owner_id) as any;
  const lineItems = JSON.parse(row.line_items_json || '[]');

  return {
    reference: row.reference,
    customerName: cust?.name ?? 'Unknown',
    customerId: row.customer_id,
    ownerName: owner?.name ?? 'Unassigned',
    receivedAt: row.received_at,
    aircraft: row.aircraft,
    engine: row.engine,
    application: row.application,
    programme: row.programme,
    requiredDeliveryWeeks: row.required_delivery_weeks,
    lineCount: lineItems.length,
    lineItems,
  };
}

/** Runs the full pipeline for one RFQ. */
export function processRfq(reference: string): WorkPackage {
  const t0 = Date.now();
  const rfq = loadRfq(reference);
  const stages: WorkPackage['stages'] = [];

  stages.push({ key: 'read', label: 'Read', detail: `Parsed ${rfq.reference} from ${rfq.customerName}` });
  stages.push({
    key: 'extract', label: 'Extract',
    detail: `${rfq.lineCount} line items, ${rfq.aircraft}${rfq.engine ? ` / ${rfq.engine}` : ''}`,
    count: rfq.lineCount,
  });

  // Prior supply history for this customer, used to spot repeat items.
  const priorQuotes = demoDb().prepare(
    'SELECT * FROM quotes WHERE customer_id = ? ORDER BY issued_at DESC').all(rfq.customerId) as any[];
  const priorRfqs = demoDb().prepare(
    "SELECT * FROM rfqs WHERE customer_id = ? AND status != 'open'").all(rfq.customerId) as any[];
  const previouslySuppliedParts = new Set<string>(
    (demoDb().prepare(
      'SELECT related_parts FROM documents WHERE customer_id = ? AND related_parts IS NOT NULL'
    ).all(rfq.customerId) as any[])
      .flatMap((r) => { try { return JSON.parse(r.related_parts) as string[]; } catch { return []; } })
      .map((p) => p.toUpperCase()),
  );

  const lines: MatchedLine[] = rfq.lineItems.map((li: any) => {
    const requested: string | null = li.requestedPart ?? null;
    let product: Product | null = null;
    let confidence: MatchedLine['confidence'] = 'none';
    let reason = '';

    // 1. Exact part-number lookup against the real catalogue.
    if (requested) {
      product = productByPartNumber(requested);
      if (product) {
        confidence = 'exact';
        reason = `Exact catalogue match on part number ${requested}.`;
      }
    }

    // 2. Fall back to hybrid retrieval on the description.
    if (!product) {
      const query = [rfq.aircraft, rfq.engine, li.description].filter(Boolean).join(' ');
      const res = retrieve(query, { limit: 3 });
      const best = res.results[0];
      if (best && (best.matchClass === 'strong' || best.matchClass === 'potential')) {
        product = best.product;
        confidence = best.matchClass === 'strong' ? 'strong' : 'possible';
        reason = `No exact part number match. Closest catalogue record found by description (${best.matchClass}).`;
      } else {
        reason = requested
          ? `Part number ${requested} does not resolve to a catalogue record, and no close description match was found.`
          : 'No catalogue record matched this description.';
      }
    }

    // 3. Classification, and the human-review gates.
    let status: LineStatus = 'unmatched';
    let reviewReason: string | null = null;

    if (product && confidence === 'exact') {
      status = 'matched';
    } else if (product && confidence === 'strong' && !requested) {
      // No part number was supplied, but the description matches strongly.
      status = 'review';
      reviewReason = 'Matched on description only — confirm this is the intended item before quoting.';
    } else if (requested) {
      // A specific part number was requested and it does NOT resolve. A loose
      // description match is not evidence that a different item is equivalent,
      // so this is reported as no confirmed match rather than a substitution.
      status = 'unmatched';
      reviewReason =
        `Requested part number ${requested} does not resolve to a catalogue record. ` +
        'The catalogue does not establish an equivalent, so this requires sourcing or ' +
        'clarification with the customer.';
      product = null;
      confidence = 'none';
    } else {
      status = 'unmatched';
      reviewReason = 'No confirmed catalogue match. Requires sourcing or clarification with the customer.';
    }

    // Engine mismatch against the RFQ's stated engine is always a human call.
    if (product && rfq.engine && product.engine && product.engine !== rfq.engine) {
      status = 'review';
      reviewReason = `Catalogue record names the ${product.engine} engine, but this enquiry specifies ${rfq.engine}.`;
    }

    // Only notes that signal a DISCREPANCY warrant human review. A note simply
    // recording that we have supplied the item before is useful context, not an
    // exception, and routing it to a human would inflate the queue.
    const discrepancy = /differ|different|unclear|conflict|revision|not sure|no field|no catalogue|customer-specific/i;
    if (li.notes && discrepancy.test(li.notes) && status === 'matched') {
      status = 'review';
      reviewReason = `Customer note indicates a possible discrepancy: ${li.notes}`;
    }

    return {
      line: li.line, requestedPart: requested, description: li.description,
      quantity: li.quantity, status, product, reason, reviewReason,
      previouslySupplied: requested ? previouslySuppliedParts.has(requested.toUpperCase()) : false,
      previousQuoteRef: requested && previouslySuppliedParts.has(requested.toUpperCase())
        ? (priorQuotes[0]?.reference ?? null) : null,
      leadTimeDays: product?.leadTimeDays ?? null,
      confidence,
    };
  });

  const counts = {
    total: lines.length,
    matched: lines.filter((l) => l.status === 'matched').length,
    review: lines.filter((l) => l.status === 'review').length,
    unmatched: lines.filter((l) => l.status === 'unmatched').length,
  };

  stages.push({ key: 'classify', label: 'Classify', detail: `${counts.total} items classified`, count: counts.total });
  stages.push({ key: 'match', label: 'Match', detail: `${counts.matched} exact catalogue matches`, count: counts.matched });
  stages.push({
    key: 'history', label: 'Retrieve history',
    detail: `${priorRfqs.length} previous enquiries, ${priorQuotes.length} previous quotes`,
    count: priorRfqs.length,
  });
  stages.push({
    key: 'exceptions', label: 'Identify exceptions',
    detail: `${counts.review + counts.unmatched} items require human attention`,
    count: counts.review + counts.unmatched,
  });
  stages.push({ key: 'package', label: 'Create work package', detail: 'Work package assembled for review' });

  // Items whose lead time is unknown or exceeds the requirement need chasing.
  const requiredDays = rfq.requiredDeliveryWeeks ? rfq.requiredDeliveryWeeks * 7 : null;
  const noLeadTime = lines.filter((l) => l.product && l.leadTimeDays === null).length;
  const tooSlow = lines.filter((l) =>
    l.product && l.leadTimeDays !== null && requiredDays !== null && l.leadTimeDays > requiredDays).length;
  const supplierFollowUps = noLeadTime + tooSlow;

  return {
    extracted: rfq, lines, counts,
    history: {
      priorRfqs: priorRfqs.length,
      priorQuotes: priorQuotes.length,
      lastQuoteValueGbp: priorQuotes[0]?.value_gbp ?? null,
    },
    supplierFollowUps,
    recommendedAction:
      counts.review + counts.unmatched > 0
        ? `Begin technical review of the ${counts.review + counts.unmatched} flagged ${counts.review + counts.unmatched === 1 ? 'item' : 'items'}, ` +
          `and request current supplier availability for the ${noLeadTime} ${noLeadTime === 1 ? 'item' : 'items'} whose ` +
          `lead time the catalogue does not publish` +
          (tooSlow > 0 ? `, plus ${tooSlow} listed beyond the ${rfq.requiredDeliveryWeeks}-week requirement.` : '.')
        : 'Proceed to quotation preparation, confirming current supplier availability before issuing a delivery position.',
    humanGates: [
      'Technical suitability is not confirmed by this workflow — Engineering sign-off is required.',
      'No pricing is committed. Commercial prepares and approves the quotation.',
      'No delivery date is offered until the supplier confirms availability in writing.',
      'Nothing is sent to the customer without the account owner’s approval.',
    ],
    durationMs: Date.now() - t0,
    stages,
  };
}
