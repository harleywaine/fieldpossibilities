/**
 * Grounded answering (brief §21, §31).
 *
 * The deterministic composers below are the default output AND the fallback for
 * the LLM path. They only ever reference values already present on a retrieved
 * record, so no claim can outrun the source.
 */
import type { ScoredProduct } from '../catalogue/types.ts';
import type { Requirement } from './requirement.ts';
import { getProvider } from './provider.ts';
import { GROUNDING_RULES, buildSearchPrompt, buildComparisonPrompt, buildQuestionPrompt } from './prompts.ts';
import { MATCH_LABELS } from './ranking.ts';

export interface Assessment {
  text: string;
  provider: string;
  disclaimer: string;
}

export const STANDARD_DISCLAIMER =
  'AI assessment based on publicly available catalogue information. ' +
  'Field should confirm current availability, suitability and delivery before purchase.';

const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const ref = (s: ScoredProduct) => s.product.partNumber ?? s.product.name.slice(0, 40);

/** "787" + "9" → "787-9", so limitations name the variant the customer used. */
function variantLabel(req: Requirement): string {
  const model = req.aircraftModels[0]?.split(' ').pop() ?? '';
  return model ? `${model}-${req.aircraftVariantRequested}` : `-${req.aircraftVariantRequested}`;
}

export interface AssessmentTotals {
  /** Strong matches across the whole result set, not just the slice shown. */
  strong: number;
  potential: number;
}

/** Deterministic search assessment composed strictly from retrieved fields. */
export function composeSearchAssessment(
  req: Requirement,
  results: ScoredProduct[],
  totals?: AssessmentTotals,
): string {
  if (results.length === 0) {
    return (
      'No catalogue records matched this requirement. The catalogue may not cover this ' +
      'aircraft, application or tooling type. Try describing the maintenance task in ' +
      'different terms, or browse the catalogue directly.'
    );
  }

  // Counts describe the full result set; `results` may be a display slice.
  const strongCount = totals?.strong ?? results.filter((r) => r.matchClass === 'strong').length;
  const top = results[0];
  const p = top.product;
  const S: string[] = [];

  // 1. What was found.
  if (strongCount > 0) {
    S.push(
      `${strongCount} catalogue ${strongCount === 1 ? 'record' : 'records'} ` +
      `${strongCount === 1 ? 'matches' : 'match'} every element of the requirement that the catalogue records.`,
    );
  } else {
    S.push(
      'No catalogue record establishes every element of this requirement. ' +
      `The closest ${results.length === 1 ? 'entry is' : 'entries are'} listed below as potential matches.`,
    );
  }

  // 2. Why the leading record fits — citing only recorded fields.
  const because: string[] = [];
  if (p.aircraftModel) because.push(`is listed for ${p.aircraftModel}`);
  if (p.engine) because.push(`names the ${p.engine} engine`);
  if (p.application) because.push(`lists its application as “${p.application}”`);
  else if (p.maintenanceCategory) because.push(`is categorised under ${p.maintenanceCategory.toLowerCase()}`);
  if (because.length) {
    S.push(`${ref(top)} ${list(because)}, which is why it ranks first.`);
  }

  // 3. Delivery — reported, never promised. Scope is stated explicitly, because
  //    these figures describe the records shown rather than the whole catalogue.
  if (req.leadTimeDays !== null) {
    const withLead = results.filter((r) => r.product.leadTimeDays !== null);
    const within = withLead.filter((r) => r.product.leadTimeDays! <= req.leadTimeDays!);
    const shown = `${results.length} ${results.length === 1 ? 'record' : 'records'} shown`;

    if (withLead.length === 0) {
      S.push(
        `The catalogue publishes no lead time for any of the ${shown}, so the ` +
        `${req.leadTimeDays}-day delivery requirement cannot be assessed from catalogue data.`,
      );
    } else if (within.length === 0) {
      S.push(
        `Of the ${shown}, ${withLead.length} ${withLead.length === 1 ? 'publishes' : 'publish'} ` +
        `a lead time and none is within ${req.leadTimeDays} days — the shortest listed is ` +
        `${Math.min(...withLead.map((r) => r.product.leadTimeDays!))} days.`,
      );
    } else {
      S.push(
        `Of the ${shown}, ${withLead.length} ${withLead.length === 1 ? 'publishes' : 'publish'} a lead time, ` +
        `and ${within.length} ${within.length === 1 ? 'is' : 'are'} within ${req.leadTimeDays} days ` +
        `(shortest ${Math.min(...within.map((r) => r.product.leadTimeDays!))} days). ` +
        `Lead time is not published for the remainder.`,
      );
    }
  }

  // 4. What the catalogue cannot establish.
  const limits: string[] = [];
  if (req.aircraftVariantRequested) {
    limits.push(
      `applicability is recorded at model level (${p.aircraftModel ?? 'aircraft model'}), so cover for ` +
      `the ${variantLabel(req)} variant specifically is not established`,
    );
  }
  if (req.engines.length && results.some((r) => !r.product.engine)) {
    limits.push(
      `not every record names an engine, so ${req.engines[0]} compatibility is not established for those`,
    );
  }
  if (limits.length) S.push(`Note that ${list(limits)}.`);

  S.push('Confirm suitability and current availability with Field before ordering.');
  return S.join(' ');
}

export function composeComparison(results: ScoredProduct[]): string {
  if (results.length < 2) return 'Select at least two products to compare.';
  const S: string[] = [];
  const best = results.reduce((a, b) => (a.score >= b.score ? a : b));

  const reasons: string[] = [];
  if (best.product.aircraftModel) reasons.push(`its recorded aircraft applicability (${best.product.aircraftModel})`);
  if (best.product.engine) reasons.push(`the engine named in its listing (${best.product.engine})`);
  if (best.product.application) reasons.push(`its stated application`);
  S.push(
    `${ref(best)} appears to be the closest catalogue match because ${list(reasons.length ? reasons : ['it scores highest across the recorded fields'])} ` +
    `align most closely with the requirement.`,
  );

  // Lead time comparison — only over records that publish one.
  const withLead = results.filter((r) => r.product.leadTimeDays !== null);
  if (withLead.length === 0) {
    S.push('None of the selected products publishes a lead time, so they cannot be compared on delivery.');
  } else if (withLead.length < results.length) {
    const fastest = withLead.reduce((a, b) => (a.product.leadTimeDays! <= b.product.leadTimeDays! ? a : b));
    S.push(
      `On delivery, only ${withLead.length} of ${results.length} publish a lead time; ` +
      `${ref(fastest)} lists the shortest at ${fastest.product.leadTimeDays} days. ` +
      `The others cannot be compared on lead time from catalogue data.`,
    );
  } else {
    const fastest = withLead.reduce((a, b) => (a.product.leadTimeDays! <= b.product.leadTimeDays! ? a : b));
    S.push(`${ref(fastest)} lists the shortest lead time at ${fastest.product.leadTimeDays} days.`);
  }

  // Dimensions on which the catalogue simply cannot separate them.
  const silent: string[] = [];
  if (results.every((r) => !r.product.weight)) silent.push('weight');
  if (results.every((r) => !r.product.dimensions)) silent.push('dimensions');
  if (results.every((r) => !r.product.engine)) silent.push('engine applicability');
  if (silent.length) S.push(`The catalogue publishes no ${list(silent)} for any of these products.`);

  S.push('This assessment is based on catalogue information and does not constitute technical approval.');
  return S.join(' ');
}

/** Deterministic answer to a follow-up question, refusing to overclaim. */
export function composeAnswer(question: string, results: ScoredProduct[]): string {
  const q = question.toLowerCase();
  const withLead = results.filter((r) => r.product.leadTimeDays !== null);

  if (/fastest|quickest|soonest|lead time|deliver/.test(q)) {
    if (withLead.length === 0) {
      return (
        'The catalogue does not publish a lead time for any of the selected products, so it is ' +
        'not possible to say which would be delivered fastest from catalogue data alone. ' +
        'Field would need to confirm current lead times. ' + STANDARD_DISCLAIMER
      );
    }
    const fastest = withLead.reduce((a, b) => (a.product.leadTimeDays! <= b.product.leadTimeDays! ? a : b));
    const unknown = results.length - withLead.length;
    return (
      `Of the selected products, ${ref(fastest)} lists the shortest lead time in the catalogue at ` +
      `${fastest.product.leadTimeDays} days.` +
      (unknown > 0
        ? ` ${unknown} of the selected ${unknown === 1 ? 'product does' : 'products do'} not publish a lead time, so ${unknown === 1 ? 'it' : 'they'} cannot be ranked on delivery.`
        : '') +
      ' The catalogue lists lead times; it does not guarantee delivery dates. ' + STANDARD_DISCLAIMER
    );
  }

  // Equivalence / substitution — the question the system must refuse to answer.
  if (/replace|substitute|equivalent|instead of|interchange|alternative to|same as/.test(q)) {
    return (
      'The catalogue does not establish equivalence between products. It records part numbers, ' +
      'aircraft applicability, application and category, but it does not state that one tool is an ' +
      'approved alternative to another, and it publishes no interchangeability or certification data. ' +
      'On the available information this question cannot be answered, and substitution of aerospace ' +
      'tooling should be confirmed with Field and against the applicable maintenance manual. ' +
      STANDARD_DISCLAIMER
    );
  }

  if (/certif|approv|airworth|easa|faa/.test(q)) {
    return (
      'The catalogue does not publish certification or approval status for these products, so no ' +
      'certification claim can be made from it. Some listings carry a "(CE)" marking in the product ' +
      'name, but that is the extent of what the source records. Confirm approval status with Field. ' +
      STANDARD_DISCLAIMER
    );
  }

  if (/weight|heavy|dimension|size|how big/.test(q)) {
    const known = results.filter((r) => r.product.weight || r.product.dimensions);
    if (known.length === 0) {
      return 'The catalogue publishes no weight or dimension data for the selected products. ' + STANDARD_DISCLAIMER;
    }
    return (
      known
        .map((r) => `${ref(r)}: ${[r.product.weight, r.product.dimensions].filter(Boolean).join(', ')}`)
        .join('; ') +
      `. The remaining ${results.length - known.length} selected ${results.length - known.length === 1 ? 'product does' : 'products do'} not publish these figures. ` +
      STANDARD_DISCLAIMER
    );
  }

  return composeComparison(results) + ' ' + STANDARD_DISCLAIMER;
}

// ---------------------------------------------------------------- public API

export async function explainSearch(
  req: Requirement,
  results: ScoredProduct[],
  totals?: AssessmentTotals,
): Promise<Assessment> {
  const provider = getProvider();
  const { text, provider: used } = await provider.complete({
    system: GROUNDING_RULES,
    prompt: buildSearchPrompt(req, results.slice(0, 8)),
    maxTokens: 700,
    fallback: () => composeSearchAssessment(req, results, totals),
  });
  return { text, provider: used, disclaimer: STANDARD_DISCLAIMER };
}

export async function explainComparison(
  req: Requirement | null,
  results: ScoredProduct[],
): Promise<Assessment> {
  const provider = getProvider();
  const { text, provider: used } = await provider.complete({
    system: GROUNDING_RULES,
    prompt: buildComparisonPrompt(req, results),
    maxTokens: 700,
    fallback: () => composeComparison(results),
  });
  return { text, provider: used, disclaimer: 'This assessment is based on catalogue information and does not constitute technical approval.' };
}

export async function answerQuestion(
  question: string,
  req: Requirement | null,
  results: ScoredProduct[],
): Promise<Assessment> {
  const provider = getProvider();
  const { text, provider: used } = await provider.complete({
    system: GROUNDING_RULES,
    prompt: buildQuestionPrompt(question, req, results),
    maxTokens: 700,
    fallback: () => composeAnswer(question, results),
  });
  return { text, provider: used, disclaimer: STANDARD_DISCLAIMER };
}

export { MATCH_LABELS };
