/**
 * Turns a customer's free-text request into a quote request.
 *
 * Every line comes from real catalogue retrieval, and every flag on a line is
 * derived from what that catalogue record does or doesn't establish — nothing
 * is scripted. The customer is synthetic (the internal side of Field isn't
 * public); the parts, evidence and lead times are real.
 */
import { createHash } from 'node:crypto';
import { retrieve } from '../ai/retrieval.ts';
import { demoDb } from '../db/demo.ts';
import type { EvidenceItem, MatchClass } from '../catalogue/types.ts';

export type LineFlag =
  | { kind: 'review'; reason: string }
  | { kind: 'supplier'; reason: string };

export interface SimLine {
  line: number;
  productId: string;
  partNumber: string | null;
  name: string;
  quantity: number;
  matchClass: MatchClass;
  aircraft: string | null;
  engine: string | null;
  leadTimeDays: number | null;
  sourceUrl: string;
  evidence: EvidenceItem[];
  flags: LineFlag[];
}

export interface SimCustomer {
  id: string;
  name: string;
  country: string;
  owner: string | null;
}

export interface SimRfq {
  reference: string;
  customer: SimCustomer;
  request: string;
  understood: Array<{ label: string; value: string; note?: string }>;
  searchSteps: Array<{ label: string; detail: string }>;
  searchMs: number;
  considered: number;
  aircraft: string | null;
  variant: string | null;
  engine: string | null;
  deadlineDays: number | null;
  deadlinePhrase: string | null;
  lines: SimLine[];
}

const MAX_LINES = 6;

export function listCustomers(): SimCustomer[] {
  const rows = demoDb().prepare(`
    SELECT c.id, c.name, c.country, e.name AS owner
    FROM customers c LEFT JOIN employees e ON e.id = c.account_owner_id
    ORDER BY c.id
  `).all() as any[];
  return rows.map((r) => ({ id: r.id, name: r.name, country: r.country, owner: r.owner ?? null }));
}

export function buildSimulatedRfq(request: string, customerId?: string): SimRfq {
  const customers = listCustomers();
  const customer = customers.find((c) => c.id === customerId) ?? customers[0];

  const result = retrieve(request, { limit: 24 });
  const req = result.requirement;

  // Strong matches first, then potential, then — only if nothing better
  // exists — alternatives, so a vague request still produces something to
  // work through rather than an empty document.
  const ranked = [
    ...result.results.filter((r) => r.matchClass === 'strong'),
    ...result.results.filter((r) => r.matchClass === 'potential'),
  ];
  const pool = ranked.length ? ranked : result.results.filter((r) => r.matchClass === 'alternative');
  const chosen = pool.slice(0, MAX_LINES);

  const deadline = req.leadTimeDays;

  const lines: SimLine[] = chosen.map((s, i) => {
    const p = s.product;
    const flags: LineFlag[] = [];

    if (s.matchClass !== 'strong') {
      flags.push({
        kind: 'review',
        reason: 'Relevant, but the catalogue doesn’t establish every part of the request for this item.',
      });
    }
    if (req.aircraftVariantRequested && p.aircraftModel) {
      flags.push({
        kind: 'review',
        reason: `The request mentions a variant (-${req.aircraftVariantRequested}); the catalogue lists ${p.aircraftModel} only.`,
      });
    }
    if (req.engines.length && !p.engine) {
      flags.push({
        kind: 'review',
        reason: `The request names ${req.engines[0]}; this catalogue record doesn’t name an engine.`,
      });
    }
    if (p.leadTimeDays === null) {
      flags.push({ kind: 'supplier', reason: 'The catalogue doesn’t publish a lead time for this item.' });
    } else if (deadline !== null && p.leadTimeDays > deadline) {
      flags.push({
        kind: 'supplier',
        reason: `Catalogue lead time is ${p.leadTimeDays} days — longer than the ${deadline}-day deadline.`,
      });
    }

    return {
      line: i + 1,
      productId: p.id,
      partNumber: p.partNumber,
      name: p.name,
      quantity: 1,
      matchClass: s.matchClass,
      aircraft: p.aircraftModel,
      engine: p.engine,
      leadTimeDays: p.leadTimeDays,
      sourceUrl: p.sourceUrl,
      evidence: s.evidence,
      flags,
    };
  });

  const hash = createHash('sha1').update(`${request}|${customer?.id}`).digest('hex');
  const reference = `RFQ-S${parseInt(hash.slice(0, 6), 16) % 90000 + 10000}`;

  return {
    reference,
    customer,
    request,
    understood: req.understood,
    searchSteps: result.trace.steps,
    searchMs: result.trace.durationMs,
    considered: result.trace.ranked,
    aircraft: req.aircraftModels[0] ?? null,
    variant: req.aircraftVariantRequested,
    engine: req.engines[0] ?? null,
    deadlineDays: deadline,
    deadlinePhrase: req.leadTimePhrase,
    lines,
  };
}
