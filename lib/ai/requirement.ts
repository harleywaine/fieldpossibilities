/**
 * Requirement extraction (brief §18).
 *
 * Turns a plain-English engineering requirement into catalogue concepts. The
 * catalogue's vocabulary is closed — 27 aircraft models, 6 manufacturers, ~40
 * ATA maintenance categories, a known set of engine programmes — so extraction
 * is entity resolution against that vocabulary rather than open-ended parsing.
 * Deterministic, instant, and free to run.
 *
 * Crucially it records what the USER asked for separately from what the
 * CATALOGUE can express. A request for a "787-9" resolves to the catalogue term
 * "BOEING 787" while retaining "-9" as an unverifiable variant, so downstream
 * output can decline to claim variant-level applicability (brief §20).
 */
import { AIRCRAFT_SYNONYMS, ENGINES, APPLICATIONS } from '../catalogue/lexicon.ts';

export interface Requirement {
  raw: string;
  /** Catalogue aircraft-model terms the query maps onto. */
  aircraftModels: string[];
  /** Variant text the user supplied that the catalogue does not model (e.g. "-9"). */
  aircraftVariantRequested: string | null;
  manufacturers: string[];
  engines: string[];
  applications: string[];
  maintenanceCategories: string[];
  partNumbers: string[];
  leadTimeDays: number | null;
  leadTimePhrase: string | null;
  keywords: string[];
  /** Human-readable extraction steps for the processing UI (brief §26). */
  understood: Array<{ label: string; value: string; note?: string }>;
}

const MAINTENANCE_TERMS: Array<[string, RegExp]> = [
  ['FLIGHT CONTROLS', /flight control|aileron|flaperon|rudder|elevator|slat|spoiler|\bflap\b/i],
  ['LANDING GEAR', /landing gear|undercarriage|\bmlg\b|\bnlg\b|\baxle\b|\bwheel\b|\bbrake\b/i],
  ['POWER PLANT', /power ?plant|\bengine\b|nacelle|pylon|cowl/i],
  ['EXHAUST', /exhaust|tail ?pipe|nozzle/i],
  ['DOORS', /\bdoors?\b|hatch|passenger entry|cargo door/i],
  ['FUEL', /\bfuel\b|fuel tank|refuel|defuel/i],
  ['NAVIGATION', /navigation|\bnav\b|avionic/i],
  ['PNEUMATIC', /pneumatic|bleed air/i],
  ['HYDRAULIC POWER', /hydraulic/i],
  ['ELECTRICAL POWER', /electrical|wiring|harness/i],
  ['STABILIZERS', /stabili[sz]er|tailplane|empennage/i],
  ['PARKING AND MOORING', /parking|mooring|protective cover|storage/i],
  ['LIFTING AND SHORING', /lifting|shoring|jack|hoist|sling|crane/i],
  ['TOWING AND TAXIING', /towing|towbar|tow bar|taxi|pushback/i],
  ['STRUCTURES', /structure|fuselage|airframe|skin|panel/i],
  ['AIR CONDITIONING', /air conditioning|\bpack\b|\bhvac\b/i],
  ['AUXILIARY POWER', /\bapu\b|auxiliary power/i],
  ['FIRE PROTECTION', /fire protection|extinguish/i],
  ['OXYGEN', /oxygen/i],
  ['WATER/WASTE', /water|waste|lavatory|potable/i],
  ['NACELLES/PYLONS', /nacelle|pylon/i],
  ['SERVICING', /servicing|service panel/i],
];

/** "within ten weeks", "70 days", "3 months", "by the end of Q3". */
export function parseLeadTime(text: string): { days: number | null; phrase: string | null } {
  const t = text.toLowerCase();
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1,
  };
  const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : (words[s] ?? NaN));

  const m = t.match(
    /(?:within|inside|under|less than|no more than|in|by|max(?:imum)? of|need(?:ed)? (?:it )?in)?\s*(\d+|[a-z]+)\s*(day|week|month)s?/,
  );
  if (m) {
    const n = num(m[1]);
    if (Number.isFinite(n)) {
      const mult = m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30;
      return { days: n * mult, phrase: `${m[1]} ${m[2]}${n === 1 ? '' : 's'}` };
    }
  }
  if (/\basap\b|as soon as possible|urgent|immediately/.test(t)) {
    return { days: null, phrase: 'as soon as possible' };
  }
  return { days: null, phrase: null };
}

/** Matches free text to catalogue aircraft terms, isolating any variant suffix. */
export function parseAircraft(text: string): {
  models: string[];
  variant: string | null;
} {
  const t = ` ${text.toLowerCase()} `;
  const models = new Set<string>();
  let variant: string | null = null;

  for (const [canonical, synonyms] of Object.entries(AIRCRAFT_SYNONYMS)) {
    for (const syn of synonyms) {
      const esc = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Allow a trailing variant such as -9, -800, MAX, NEO without absorbing it.
      const re = new RegExp(`[\\s(]${esc}(?:\\s?-\\s?(\\d{1,3}|max|neo|er|lr|f))?[\\s),.]`, 'i');
      const m = t.match(re);
      if (m) {
        models.add(canonical);
        if (m[1]) variant = m[1].toUpperCase();
        // A synonym that itself encodes a variant ("787-9", "737-800").
        const inner = syn.match(/^(?:b|a)?\d{3}-(\d{1,3})$/i);
        if (inner) variant = inner[1];
        break;
      }
    }
  }
  return { models: [...models], variant };
}

export function extractRequirement(query: string): Requirement {
  const raw = query.trim();
  const text = ` ${raw} `;

  const { models, variant } = parseAircraft(raw);

  const engines = ENGINES
    .filter((e) => e.canonical !== 'APU' && e.patterns.some((p) => p.test(raw)))
    .map((e) => e.canonical);
  // Keep only the most specific engine mention (ENGINES is ordered specific-first).
  const engine = engines.length ? [engines[0]] : [];

  const applications = APPLICATIONS
    .filter((a) => a.patterns.some((p) => p.test(raw)))
    .map((a) => a.canonical);

  const maintenanceCategories = MAINTENANCE_TERMS
    .filter(([, re]) => re.test(raw))
    .map(([name]) => name);

  const manufacturers: string[] = [];
  if (/\bboeing\b/i.test(text) || models.some((m) => m.startsWith('BOEING'))) manufacturers.push('BOEING');
  if (/\bairbus\b/i.test(text) || models.some((m) => m.startsWith('AIRBUS'))) manufacturers.push('AIRBUS');
  if (/mcdonnell|douglas\b/i.test(text) || models.some((m) => /^(DC|MD)-/.test(m))) {
    manufacturers.push('MCDONNELL DOUGLAS');
  }
  if (/\bembraer\b/i.test(text)) manufacturers.push('EMBRAER');
  if (/\bdillon\b/i.test(text)) manufacturers.push('DILLON');

  // Field part numbers look like K10009-1, C78005-26, F80229-48, 32224-0011.
  const partNumbers = [...new Set(
    (raw.match(/\b[A-Z]{0,2}\d{4,6}-\d{1,4}\b/gi) ?? []).map((s) => s.toUpperCase()),
  )];

  const { days, phrase } = parseLeadTime(raw);

  const keywords = (raw.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [])
    .filter((w) => !STOP.has(w));

  const understood: Requirement['understood'] = [];
  if (models.length) {
    understood.push({
      label: 'Aircraft identified',
      value: models.join(', '),
      note: variant
        ? `Requirement mentions the ${models[0]?.split(' ').pop() ?? ''}-${variant} variant. ` +
          `The catalogue records applicability at model level only.`
        : undefined,
    });
  }
  if (engine.length) understood.push({ label: 'Engine identified', value: engine.join(', ') });
  if (applications.length) {
    understood.push({ label: 'Maintenance application identified', value: applications.join(', ') });
  }
  if (maintenanceCategories.length) {
    understood.push({ label: 'Maintenance category identified', value: maintenanceCategories.slice(0, 3).join(', ') });
  }
  if (days !== null) {
    understood.push({ label: 'Delivery requirement identified', value: `${days} days (${phrase})` });
  } else if (phrase) {
    understood.push({ label: 'Delivery requirement identified', value: phrase });
  }
  if (partNumbers.length) understood.push({ label: 'Part number supplied', value: partNumbers.join(', ') });

  return {
    raw,
    aircraftModels: models,
    aircraftVariantRequested: variant,
    manufacturers: [...new Set(manufacturers)],
    engines: engine,
    applications,
    maintenanceCategories,
    partNumbers,
    leadTimeDays: days,
    leadTimePhrase: phrase,
    keywords,
    understood,
  };
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'has', 'have',
  'need', 'needs', 'needed', 'want', 'looking', 'require', 'required', 'requirement',
  'were', 'our', 'you', 'your', 'can', 'any', 'all', 'get', 'find', 'show', 'give',
  'maintaining', 'maintenance', 'aircraft', 'tooling', 'tool', 'tools', 'equipment',
  'within', 'weeks', 'week', 'days', 'day', 'months', 'month', 'delivery', 'deliver',
]);

/** Expanded query text used by the semantic index (query-side only). */
export function expandForSemantic(req: Requirement): string {
  const parts: string[] = [req.raw];
  for (const a of req.applications) {
    const entry = APPLICATIONS.find((x) => x.canonical === a);
    if (entry) parts.push(entry.expand.join(' '));
  }
  parts.push(...req.aircraftModels, ...req.engines, ...req.maintenanceCategories);
  return parts.join(' ');
}
