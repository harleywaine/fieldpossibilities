/**
 * Prompts for the grounded answering layer (brief §21).
 *
 * The system prompt encodes the non-negotiable rules from §20 and §43. The user
 * prompt carries ONLY retrieved catalogue records, so the model has nothing to
 * draw on beyond the source.
 */
import type { ScoredProduct } from '../catalogue/types.ts';
import type { Requirement } from './requirement.ts';

export const GROUNDING_RULES = `You are an assistant to an aerospace ground-support tooling catalogue.

You are given a customer requirement and a set of catalogue records retrieved from
Field International's public catalogue. You must obey these rules absolutely:

1. Only state facts that appear in the retrieved records. Never add specifications,
   certifications, approvals, compatibility or availability from outside knowledge.
2. If a record lists an aircraft as "BOEING 787", do NOT claim it covers "787-9" or
   any other variant. The catalogue records applicability at model level only.
3. If no engine is named on a record, say the engine is not stated. Never infer an
   engine from the aircraft model.
4. Never promise delivery. If a lead time is published, report it as "the catalogue
   lists a lead time of N days". If none is published, say it is not published.
5. Never claim a product is certified, approved, or an approved equivalent unless the
   record says so in those words.
6. Never present a numeric confidence score.
7. Where the catalogue cannot answer part of the requirement, say so plainly. It is
   better to state a limitation than to produce a confident-sounding guess.
8. Be concise and factual. Write for a maintenance engineer, in British English.`;

function renderProduct(s: ScoredProduct, index: number): string {
  const p = s.product;
  const L: string[] = [`Product ${String.fromCharCode(65 + index)}`];
  const add = (k: string, v: unknown) => {
    if (v !== null && v !== undefined && String(v).trim()) L.push(`  ${k}: ${v}`);
  };
  add('Part number', p.partNumber);
  add('Name', p.name);
  add('Manufacturer', p.manufacturer);
  add('Aircraft applicability (as recorded)', p.aircraftModel);
  add('Application', p.application);
  add('Maintenance category', p.maintenanceCategory);
  add('Engine named in source', p.engine ?? 'not stated in catalogue');
  add('Lead time', p.leadTimeDays !== null ? `${p.leadTimeDays} days` : 'not published in catalogue');
  add('Weight', p.weight ?? 'not published');
  add('Dimensions', p.dimensions ?? 'not published');
  add('Condition', p.condition);
  add('Match classification', s.matchClass);
  if (s.gaps.length) L.push(`  Known limitations: ${s.gaps.join(' ')}`);
  add('Source', p.sourceUrl);
  return L.join('\n');
}

export function buildSearchPrompt(req: Requirement, results: ScoredProduct[]): string {
  const L: string[] = ['USER REQUIREMENT', '', req.raw, ''];

  L.push('EXTRACTED CONSTRAINTS');
  if (req.aircraftModels.length) L.push(`  Aircraft (catalogue term): ${req.aircraftModels.join(', ')}`);
  if (req.aircraftVariantRequested) {
    L.push(`  Variant requested by customer: -${req.aircraftVariantRequested} (NOT modelled by the catalogue)`);
  }
  if (req.engines.length) L.push(`  Engine: ${req.engines.join(', ')}`);
  if (req.applications.length) L.push(`  Application: ${req.applications.join(', ')}`);
  if (req.leadTimeDays !== null) L.push(`  Delivery requirement: within ${req.leadTimeDays} days`);
  L.push('');

  L.push(`RETRIEVED PRODUCTS (${results.length})`, '');
  results.forEach((s, i) => { L.push(renderProduct(s, i), ''); });

  L.push(
    'Write a short assessment (3–5 sentences) covering: which record best fits the',
    'requirement and why, what the catalogue does not establish, and what the customer',
    'should confirm with Field. Do not invent facts. Do not promise delivery.',
  );
  return L.join('\n');
}

export function buildComparisonPrompt(req: Requirement | null, results: ScoredProduct[]): string {
  const L: string[] = [];
  if (req?.raw) L.push('USER REQUIREMENT', '', req.raw, '');
  L.push(`PRODUCTS SELECTED FOR COMPARISON (${results.length})`, '');
  results.forEach((s, i) => { L.push(renderProduct(s, i), ''); });
  L.push(
    'Compare these products using only the information above. State which appears',
    'closest to the requirement and why, and name any dimension on which the catalogue',
    'cannot separate them. Do not assert technical equivalence or approval.',
  );
  return L.join('\n');
}

export function buildQuestionPrompt(
  question: string,
  req: Requirement | null,
  results: ScoredProduct[],
): string {
  const L: string[] = ['CUSTOMER QUESTION', '', question, ''];
  if (req?.raw) L.push('ORIGINAL REQUIREMENT', '', req.raw, '');
  L.push(`RETRIEVED PRODUCTS (${results.length})`, '');
  results.forEach((s, i) => { L.push(renderProduct(s, i), ''); });
  L.push(
    'Answer the question using only the records above. If the records cannot answer it,',
    'say exactly that and explain what would be needed. Never assert equivalence,',
    'interchangeability or approval that the catalogue does not state.',
  );
  return L.join('\n');
}
