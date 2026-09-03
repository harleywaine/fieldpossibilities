/**
 * Hybrid retrieval (brief §18).
 *
 *   query → requirement extraction → structured constraints + semantic search
 *         → candidate set → ranking → grounded explanation
 *
 * Structured data answers structured facts; semantic retrieval supplies meaning.
 * The two are fused, never conflated.
 */
import { getProducts } from '../db/client.ts';
import { structuredSearch, filtersFromRequirement } from '../search/structured.ts';
import { lexicalSearch, partNumberSearch } from '../search/lexical.ts';
import { semanticSearch } from '../search/semantic.ts';
import { extractRequirement, expandForSemantic, type Requirement } from './requirement.ts';
import { rankProduct, DEFAULT_WEIGHTS, type RankingWeights } from './ranking.ts';
import type { ScoredProduct } from '../catalogue/types.ts';

export interface RetrievalTrace {
  structuredCandidates: number;
  semanticCandidates: number;
  lexicalCandidates: number;
  partNumberCandidates: number;
  unionCandidates: number;
  ranked: number;
  strong: number;
  potential: number;
  alternative: number;
  durationMs: number;
  steps: Array<{ label: string; detail: string }>;
}

export interface RetrievalResult {
  requirement: Requirement;
  results: ScoredProduct[];
  trace: RetrievalTrace;
  /** True when nothing clears the bar and the UI must say so plainly (§47). */
  noConfirmedMatch: boolean;
}

export interface RetrieveOptions {
  limit?: number;
  weights?: RankingWeights;
  /** Restrict to products whose published lead time meets the requirement. */
  enforceLeadTime?: boolean;
}

export function retrieve(query: string, opts: RetrieveOptions = {}): RetrievalResult {
  const t0 = Date.now();
  const limit = opts.limit ?? 24;
  const req = extractRequirement(query);
  const steps: RetrievalTrace['steps'] = [];

  // ---- 1. Structured constraints over catalogue fields ----
  const structured = structuredSearch(filtersFromRequirement(req));

  // Reported separately so the trace states what the aircraft filter alone matched.
  const aircraftOnly = req.aircraftModels.length
    ? structuredSearch({ aircraftModels: req.aircraftModels, limit: 5000 })
    : [];
  steps.push({
    label: 'Aircraft applicability',
    detail: req.aircraftModels.length
      ? `${aircraftOnly.length} catalogue records list ${req.aircraftModels.join(', ')}`
      : 'No aircraft constraint in requirement',
  });

  // ---- 2. Semantic retrieval over the vector index ----
  const semantic = semanticSearch(expandForSemantic(req), 400);
  steps.push({
    label: 'Product descriptions',
    detail: `${semantic.length} records surfaced by semantic similarity`,
  });

  // ---- 3. Lexical BM25 ----
  const lexical = lexicalSearch(req.raw, 400);
  steps.push({ label: 'Application', detail: `${lexical.length} records matched on catalogue text` });

  // ---- 4. Exact part number, when supplied ----
  const byPart = req.partNumbers.length ? partNumberSearch(req.partNumbers[0]) : [];
  if (byPart.length) {
    steps.push({ label: 'Part number', detail: `${byPart.length} exact catalogue record(s)` });
  }

  steps.push({
    label: 'Lead-time information',
    detail: req.leadTimeDays !== null
      ? `Delivery requirement of ${req.leadTimeDays} days applied where the catalogue publishes a lead time`
      : 'No delivery constraint in requirement',
  });

  // ---- Fuse candidates ----
  const semScore = new Map(semantic.map((h) => [h.id, h.score]));
  const lexScore = new Map(lexical.map((h) => [h.id, h.score]));
  const ids = new Set<string>([
    ...byPart.map((h) => h.id),
    ...structured.map((h) => h.id),
    ...aircraftOnly.slice(0, 400).map((h) => h.id),
    ...semantic.slice(0, 250).map((h) => h.id),
    ...lexical.slice(0, 250).map((h) => h.id),
  ]);

  const products = getProducts([...ids]);
  let ranked = products
    .map((p) => rankProduct({
      product: p,
      requirement: req,
      semanticScore: semScore.get(p.id) ?? 0,
      lexicalScore: lexScore.get(p.id) ?? 0,
      weights: opts.weights ?? DEFAULT_WEIGHTS,
    }))
    .filter((r) => r.matchClass !== 'none');

  if (opts.enforceLeadTime && req.leadTimeDays !== null) {
    ranked = ranked.filter((r) => r.product.leadTimeDays !== null && r.product.leadTimeDays <= req.leadTimeDays!);
  }

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, limit);

  const counts = {
    strong: ranked.filter((r) => r.matchClass === 'strong').length,
    potential: ranked.filter((r) => r.matchClass === 'potential').length,
    alternative: ranked.filter((r) => r.matchClass === 'alternative').length,
  };

  return {
    requirement: req,
    results: top,
    noConfirmedMatch: counts.strong === 0 && counts.potential === 0,
    trace: {
      structuredCandidates: structured.length,
      semanticCandidates: semantic.length,
      lexicalCandidates: lexical.length,
      partNumberCandidates: byPart.length,
      unionCandidates: ids.size,
      ranked: ranked.length,
      ...counts,
      durationMs: Date.now() - t0,
      steps,
    },
  };
}
