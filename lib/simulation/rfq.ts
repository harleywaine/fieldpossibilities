/**
 * Turns a customer's free-text request into a quote request.
 *
 * Every line comes from real catalogue retrieval, and every flag on a line is
 * derived from what that catalogue record does or doesn't establish — nothing
 * is scripted. The customer is attached later, when they ask for a quote.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { retrieve } from '../ai/retrieval.ts';
import { withVariant } from '../ai/requirement.ts';
import { describeListed, parseApplicability, variantFit } from '../catalogue/variants.ts';
import type { EvidenceItem, MatchClass } from '../catalogue/types.ts';

/** What an engineer has to settle: the request and the record, side by side. */
export interface EngineeringCheck {
  topic: 'Aircraft' | 'Aircraft variant' | 'Engine' | 'Application';
  asked: string;
  catalogue: string;
  question: string;
}

export type LineFlag =
  | { kind: 'review'; reason: string; check?: EngineeringCheck }
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
  /** The catalogue's manufacturer term: BOEING, DILLON, FIL TOOLING… Decides whether Field makes it or buys it in. */
  manufacturer: string | null;
  /** As published: "In Stock", "Available to Order", "Out of stock". */
  stockStatus: string | null;
  sourceUrl: string;
  /** Catalogue photo, cached locally where possible; null when Field publishes none. */
  image: string | null;
  category: string | null;
  /** The catalogue's own description, trimmed. */
  summary: string | null;
  /** Engineering-relevant facts from the record, only those Field publishes. */
  specs: Array<{ label: string; value: string }>;
  evidence: EvidenceItem[];
  flags: LineFlag[];
}

export interface SimRfq {
  reference: string;
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

/** Catalogue text is often upper case; show it as written in a sentence. */
function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Ce|Cfm|Gse|Mlg|Nlg)\b/g, (w) => w.toUpperCase())
    .replace(/\bGenx\b/g, 'GEnx');
}

/** The description, unless it only repeats the product name. */
function describes(name: string, text: string | null): string | null {
  const t = trim(text);
  if (!t) return null;
  const n = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return n(t).length <= n(name).length + 12 && n(t).includes(n(name).slice(0, 20)) ? null : t;
}

function trim(s: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 260 ? `${t.slice(0, 257).replace(/\s\S*$/, '')}…` : t;
}

/**
 * The cached copy when this machine has it; otherwise Field's own published
 * image. The cache isn't deployed, so a hosted demo must not point at it.
 */
function imageOf(p: { images: Array<{ isPlaceholder: boolean; localPath: string | null; thumbnail: string | null; src: string }> }): string | null {
  const im = p.images.find((i) => !i.isPlaceholder);
  if (!im) return null;
  if (im.localPath && existsSync(join(process.cwd(), 'public', im.localPath))) return im.localPath;
  return im.thumbnail ?? im.src;
}

export function buildSimulatedRfq(request: string): SimRfq {
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
      const job = req.applications[0] ?? req.maintenanceCategories[0] ?? null;
      const asked = req.itemTypes.length
        ? `A ${req.itemTypes[0]}${job ? `: ${titleCase(job).toLowerCase()}` : ''}`
        : job ?? 'The task described in the request';
      flags.push({
        kind: 'review',
        reason: 'Relevant, but the catalogue doesn’t establish every part of the request for this item.',
        check: {
          topic: 'Application',
          asked: titleCase(asked),
          catalogue: titleCase(p.application ?? p.maintenanceCategory ?? p.equipmentType ?? 'Not stated'),
          question: 'Does this item do the job the customer described?',
        },
      });
    }
    const listed = p.aircraftModels.length ? p.aircraftModels : (p.aircraftModel ? [p.aircraftModel] : []);
    const aircraftFits = !req.aircraftModels.length || !listed.length
      || listed.some((m) => req.aircraftModels.some((want) => want.toUpperCase() === m.toUpperCase()));
    if (!aircraftFits) {
      // The record names other aircraft: shown as a reference point, never as a fit.
      const asked = titleCase(req.aircraftModels[0]!);
      flags.push({
        kind: 'review',
        reason: `The request is for the ${asked}; the catalogue lists this item for ${listed.map(titleCase).join(', ')}.`,
        check: {
          topic: 'Aircraft',
          asked,
          catalogue: listed.map(titleCase).join(', '),
          question: `Is there an equivalent for the ${asked}, or is this item out of scope?`,
        },
      });
    }
    // The description's own applicability line decides whether the variant is
    // covered. "737-600, 700, 800, 900" settles a 737-800 request; "B787" doesn't
    // settle a 787-9 one; "737-100 … 500" rules a 737 MAX request out.
    const applicability = parseApplicability(p.description);
    if (req.aircraftVariantRequested && p.aircraftModel && aircraftFits) {
      const model = titleCase(req.aircraftModels[0] ?? p.aircraftModel);
      const wanted = withVariant(model, req.aircraftVariantRequested);
      const fit = variantFit(applicability, req.aircraftModels[0] ?? p.aircraftModel, req.aircraftVariantRequested);
      if (fit === 'unstated') {
        flags.push({
          kind: 'review',
          reason: `The request names the ${wanted}; the catalogue lists ${p.aircraftModel} with no variant stated.`,
          check: {
            topic: 'Aircraft variant',
            asked: wanted,
            catalogue: `${(p.aircraftModels.length ? p.aircraftModels : [p.aircraftModel]).map(titleCase).join(', ')}: model only, no variant stated`,
            question: `Does it fit the ${wanted}?`,
          },
        });
      } else if (fit === 'contradicted') {
        flags.push({
          kind: 'review',
          reason: `The request names the ${wanted}; the catalogue lists this item for the ${describeListed(applicability!, req.aircraftModels[0] ?? p.aircraftModel)}.`,
          check: {
            topic: 'Aircraft variant',
            asked: wanted,
            catalogue: describeListed(applicability!, req.aircraftModels[0] ?? p.aircraftModel),
            question: `Is there a ${wanted} equivalent, or is this item out of scope?`,
          },
        });
      }
    }
    if (req.engines.length && !p.engine) {
      flags.push({
        kind: 'review',
        reason: `The request names ${req.engines[0]}; this catalogue record doesn’t name an engine.`,
        check: {
          topic: 'Engine',
          asked: req.engines[0]!,
          catalogue: 'No engine named',
          question: `Is it right for the ${req.engines[0]} installation?`,
        },
      });
    }
    if (p.leadTimeDays === null) {
      flags.push({ kind: 'supplier', reason: 'The catalogue doesn’t publish a lead time for this item.' });
    } else if (deadline !== null && p.leadTimeDays > deadline) {
      flags.push({
        kind: 'supplier',
        reason: `Catalogue lead time is ${p.leadTimeDays} days, longer than the ${deadline}-day deadline.`,
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
      manufacturer: p.manufacturer,
      stockStatus: p.stockStatus,
      sourceUrl: p.sourceUrl,
      image: imageOf(p),
      category: p.maintenanceCategory ?? null,
      summary: describes(p.name, p.shortDescription ?? p.description),
      specs: [
        ['Equipment type', p.equipmentType],
        ['Aircraft', p.aircraftModels.length ? p.aircraftModels.join(', ') : p.aircraftModel],
        ['Applicability', applicability?.text ?? null],
        ['Engine', p.engine],
        ['Application', p.application],
        ['Weight', p.weight],
        ['Dimensions', p.dimensions],
        ['Material', p.material],
        ['CE marked', p.ceMarked === null ? null : p.ceMarked ? 'Yes' : 'No'],
      ].filter((x): x is [string, string] => Boolean(x[1])).map(([label, value]) => ({ label, value: titleCase(value) })),
      evidence: applicability
        ? [...s.evidence, { label: 'Applicability', value: applicability.text, source: 'product-description' as const, quote: `AIRCRAFT APPLICATION: ${applicability.text}` }]
        : s.evidence,
      flags,
    };
  });

  const hash = createHash('sha1').update(request).digest('hex');
  const reference = `RFQ-S${parseInt(hash.slice(0, 6), 16) % 90000 + 10000}`;

  return {
    reference,
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
