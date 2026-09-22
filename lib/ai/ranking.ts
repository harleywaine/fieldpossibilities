/**
 * Explicit ranking function (brief §19).
 *
 * Weights are configurable and deliberately transparent. Scores are NEVER shown
 * to the customer as a percentage — they are translated into a qualitative
 * match class, because a number like "97.38% confidence" implies a precision the
 * catalogue cannot support.
 */
import type { Product, EvidenceItem, MatchClass, ScoredProduct } from '../catalogue/types.ts';
import type { Requirement } from './requirement.ts';
import { APPLICATIONS, ITEM_TYPES } from '../catalogue/lexicon.ts';

export interface RankingWeights {
  aircraft: number;
  application: number;
  engine: number;
  semantic: number;
  leadTime: number;
}

export const DEFAULT_WEIGHTS: RankingWeights = {
  aircraft: 0.30,
  application: 0.30,
  engine: 0.15,
  semantic: 0.15,
  leadTime: 0.10,
};

export interface RankInput {
  product: Product;
  requirement: Requirement;
  semanticScore: number;
  lexicalScore: number;
  weights?: RankingWeights;
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase();

/** Does the product's aircraft applicability cover a requested model? */
function aircraftMatch(p: Product, req: Requirement): { score: number; matched: string | null } {
  if (req.aircraftModels.length === 0) return { score: 0, matched: null };
  const models = p.aircraftModels.length ? p.aircraftModels : [p.aircraftModel ?? ''];
  for (const want of req.aircraftModels) {
    const hit = models.find((m) => norm(m) === norm(want));
    if (hit) return { score: 1, matched: hit };
  }
  // Partial: same manufacturer family but a different model.
  const family = req.aircraftModels[0]?.split(' ')[0];
  if (family && models.some((m) => norm(m).startsWith(norm(family)))) {
    return { score: 0.25, matched: null };
  }
  return { score: 0, matched: null };
}

function applicationMatch(p: Product, req: Requirement): { score: number; matched: string | null } {
  if (req.applications.length === 0 && req.maintenanceCategories.length === 0) {
    return { score: 0, matched: null };
  }
  const haystack = `${p.name} ${p.application ?? ''} ${p.maintenanceCategory ?? ''} ${p.equipmentType ?? ''} ${p.description ?? ''}`;

  for (const want of req.applications) {
    const entry = APPLICATIONS.find((a) => a.canonical === want);
    if (entry?.patterns.some((re) => re.test(haystack))) {
      return { score: 1, matched: want };
    }
  }
  for (const cat of req.maintenanceCategories) {
    if (norm(p.maintenanceCategory) === norm(cat)) return { score: 0.85, matched: cat };
  }
  // Loose concept overlap.
  for (const want of req.applications) {
    const entry = APPLICATIONS.find((a) => a.canonical === want);
    if (entry?.expand.some((term) => haystack.toLowerCase().includes(term))) {
      return { score: 0.5, matched: want };
    }
  }
  return { score: 0, matched: null };
}

/** Does the record's own name say it is the kind of item requested? */
function itemMatch(p: Product, req: Requirement): boolean {
  if (!req.itemTypes.length) return true;
  const name = `${p.name} ${p.equipmentType ?? ''}`;
  return req.itemTypes.some((t) => ITEM_TYPES.find((i) => i.canonical === t)?.patterns.some((re) => re.test(name)));
}

function engineMatch(p: Product, req: Requirement): { score: number; matched: string | null } {
  if (req.engines.length === 0) return { score: 0, matched: null };
  for (const want of req.engines) {
    if (norm(p.engine) === norm(want)) return { score: 1, matched: want };
    if (p.description && new RegExp(want.replace(/[^\w]/g, '.?'), 'i').test(p.description)) {
      return { score: 0.7, matched: want };
    }
  }
  return { score: 0, matched: null };
}

/**
 * Lead time contributes only when the catalogue publishes one. An unpublished
 * lead time is neutral, never a penalty and never an implied pass.
 */
function leadTimeMatch(p: Product, req: Requirement): { score: number; known: boolean } {
  if (req.leadTimeDays === null) return { score: 0, known: p.leadTimeDays !== null };
  if (p.leadTimeDays === null) return { score: 0, known: false };
  if (p.leadTimeDays <= req.leadTimeDays) {
    const margin = 1 - p.leadTimeDays / Math.max(req.leadTimeDays, 1);
    return { score: 0.7 + 0.3 * margin, known: true };
  }
  const over = p.leadTimeDays - req.leadTimeDays;
  return { score: over <= 14 ? 0.25 : 0, known: true };
}

export function rankProduct(input: RankInput): ScoredProduct {
  const { product: p, requirement: req, semanticScore, lexicalScore } = input;
  const w = input.weights ?? DEFAULT_WEIGHTS;

  const ac = aircraftMatch(p, req);
  const app = applicationMatch(p, req);
  const eng = engineMatch(p, req);
  const lead = leadTimeMatch(p, req);
  const sem = Math.max(semanticScore, lexicalScore * 0.9);

  // Re-normalise across the dimensions the requirement actually constrains, so a
  // query that names no engine is not penalised on the engine axis.
  const active: Array<[number, number]> = [];
  if (req.aircraftModels.length) active.push([w.aircraft, ac.score]);
  if (req.applications.length || req.maintenanceCategories.length) active.push([w.application, app.score]);
  if (req.engines.length) active.push([w.engine, eng.score]);
  active.push([w.semantic, sem]);
  if (req.leadTimeDays !== null) active.push([w.leadTime, lead.score]);

  const totalWeight = active.reduce((s, [ww]) => s + ww, 0) || 1;
  const score = active.reduce((s, [ww, v]) => s + ww * v, 0) / totalWeight;

  // ---- Evidence: only facts the catalogue actually carries (brief §22) ----
  const evidence: EvidenceItem[] = [];
  if (ac.matched) {
    evidence.push({
      label: 'Aircraft', value: ac.matched, source: 'catalogue-record',
      quote: 'Aircraft applicability recorded on the catalogue product record.',
    });
  } else if (p.aircraftModel) {
    evidence.push({ label: 'Aircraft', value: p.aircraftModel, source: 'catalogue-record' });
  }
  if (p.application) {
    evidence.push({ label: 'Application', value: p.application, source: 'product-title', quote: p.name });
  }
  if (p.maintenanceCategory) {
    evidence.push({
      label: 'Maintenance category', value: p.maintenanceCategory, source: 'product-description',
      quote: `MAINTENACE CATEGORY: ${p.maintenanceCategory}`,
    });
  }
  if (p.engine) {
    evidence.push({ label: 'Engine', value: p.engine, source: 'product-title', quote: p.name });
  }
  if (p.leadTimeDays !== null) {
    evidence.push({
      label: 'Lead time', value: `${p.leadTimeDays} days`, source: 'product-page',
      quote: `Lead Time (days): ${p.leadTimeDays}`,
    });
  }
  if (p.partNumber) {
    evidence.push({ label: 'Part number', value: p.partNumber, source: 'catalogue-record' });
  }

  // ---- Gaps: what the requirement asked for that the source cannot confirm ----
  const gaps: string[] = [];
  if (req.aircraftVariantRequested && ac.score === 1) {
    const variantLabel = `${(ac.matched ?? '').split(' ').pop() ?? ''}-${req.aircraftVariantRequested}`;
    gaps.push(
      `Catalogue lists applicability as ${ac.matched}. It does not state whether this covers the ` +
      `${variantLabel} variant specifically.`,
    );
  }
  if (req.engines.length && !p.engine && eng.score === 0) {
    gaps.push(`No engine is named in this product's catalogue entry, so ${req.engines[0]} compatibility is not established.`);
  }
  if (req.leadTimeDays !== null && p.leadTimeDays === null) {
    gaps.push('The catalogue does not publish a lead time for this product.');
  }
  if (req.leadTimeDays !== null && p.leadTimeDays !== null && p.leadTimeDays > req.leadTimeDays) {
    gaps.push(`Catalogue lead time is ${p.leadTimeDays} days, longer than the ${req.leadTimeDays} days requested.`);
  }

  return {
    product: p,
    score,
    matchClass: classify(score, { ac: ac.score, app: app.score, eng: eng.score, item: itemMatch(p, req), req }),
    evidence,
    gaps,
    breakdown: {
      aircraft: ac.score, application: app.score, engine: eng.score,
      semantic: sem, leadTime: lead.score, total: score,
    },
  };
}

/**
 * Qualitative classification (brief §19). A "strong match" requires the
 * catalogue to positively establish the requirement's primary dimensions —
 * a high blended score alone is not sufficient.
 */
function classify(
  score: number,
  ctx: { ac: number; app: number; eng: number; item: boolean; req: Requirement },
): MatchClass {
  const { ac, app, eng, item, req } = ctx;
  const needsAircraft = req.aircraftModels.length > 0;
  const needsApp = req.applications.length > 0 || req.maintenanceCategories.length > 0;
  const needsEngine = req.engines.length > 0;

  const aircraftEstablished = !needsAircraft || ac === 1;
  const applicationEstablished = !needsApp || app >= 0.85;
  // When the requirement names an engine, the source must name it too. Inferring
  // engine fit from aircraft model is exactly the overclaim the brief forbids.
  const engineEstablished = !needsEngine || eng >= 1;

  if (aircraftEstablished && applicationEstablished && engineEstablished && item && score >= 0.6) {
    return 'strong';
  }
  if (score >= 0.45 && (aircraftEstablished || applicationEstablished)) return 'potential';
  if (score >= 0.2) return 'alternative';
  return 'none';
}

export const MATCH_LABELS: Record<MatchClass, string> = {
  strong: 'Strong match',
  potential: 'Potential match',
  alternative: 'Alternative',
  none: 'No confirmed match',
};
