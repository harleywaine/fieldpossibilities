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
import { AIRCRAFT_SYNONYMS, ENGINES, APPLICATIONS, ITEM_TYPES } from '../catalogue/lexicon.ts';

export interface Requirement {
  raw: string;
  /** The request as searched: foreign maintenance terms read as English. */
  searchText: string;
  /** Catalogue aircraft-model terms the query maps onto. */
  aircraftModels: string[];
  /** Variant text the user supplied that the catalogue does not model (e.g. "-9"). */
  aircraftVariantRequested: string | null;
  manufacturers: string[];
  engines: string[];
  applications: string[];
  /** Kinds of item named in the request ("stand", "sling"), which a match must be. */
  itemTypes: string[];
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

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'];

/**
 * Deadlines stated relative to today — "end of next month", "next week", "a
 * fortnight", "by March", "end of Q3" — resolved to a number of days from now.
 */
function relativeDeadline(t: string, now: Date): { days: number; phrase: string } | null {
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const days = (d: Date) => Math.max(1, Math.ceil((d.getTime() - now.getTime()) / 86_400_000));
  const endOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0, 23, 59));

  if (/\bnext month\b/.test(t)) return { days: days(endOfMonth(y, mo + 1)), phrase: 'end of next month' };
  if (/\bend of (?:the |this )month\b/.test(t)) return { days: days(endOfMonth(y, mo)), phrase: 'end of this month' };
  if (/\bnext week\b/.test(t)) return { days: 7, phrase: 'next week' };
  if (/\bfortnight\b/.test(t)) return { days: 14, phrase: 'a fortnight' };
  if (/\b(?:a )?couple of weeks\b/.test(t)) return { days: 14, phrase: 'a couple of weeks' };
  if (/\b(?:a )?couple of months\b/.test(t)) return { days: 60, phrase: 'a couple of months' };

  const q = t.match(/\b(?:end of |by |before )?q([1-4])\b/);
  if (q) {
    const quarterEnd = (year: number) => endOfMonth(year, Number(q[1]) * 3 - 1);
    const end = quarterEnd(y).getTime() > now.getTime() ? quarterEnd(y) : quarterEnd(y + 1);
    return { days: days(end), phrase: `end of Q${q[1]}` };
  }

  const m = t.match(new RegExp(`\\b(?:by|before|end of|until)\\s+(?:the\\s+)?(?:end of\\s+)?(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+)?(${MONTHS.join('|')})(?:\\s+(\\d{1,2})(?:st|nd|rd|th)?)?\\b`));
  if (m) {
    const month = MONTHS.indexOf(m[2]!);
    const day = Number(m[1] ?? m[3] ?? 0);
    const at = (year: number) => (day ? new Date(Date.UTC(year, month, day, 23, 59)) : endOfMonth(year, month));
    const end = at(y).getTime() > now.getTime() ? at(y) : at(y + 1);
    return { days: days(end), phrase: `by ${day ? `${day} ` : 'end of '}${m[2]![0]!.toUpperCase()}${m[2]!.slice(1)}` };
  }
  return null;
}

/** "within ten weeks", "70 days", "3 months", "end of next month", "by March". */
export function parseLeadTime(text: string, now = new Date()): { days: number | null; phrase: string | null } {
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
  const relative = relativeDeadline(t, now);
  if (relative) return relative;
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
      // Allow a plural, and a trailing variant — -9, -800, MAX, NEO, NG — without absorbing it.
      const re = new RegExp(
        `[\\s(]${esc}s?(?:\\s?-\\s?(\\d{1,3}|max|neo|ng|er|lr|f)|\\s(max|neo|ng))?(?=[\\s),.!?;:'’]|$)`, 'i');
      const m = t.match(re);
      if (m) {
        models.add(canonical);
        if (m[1] || m[2]) variant = (m[1] ?? m[2])!.toUpperCase();
        // A synonym that itself names a variant ("737max", "a320neo", "777x").
        const named = syn.match(/\d\s?(max|neo|ng|x)$/i);
        if (named) variant = named[1]!.toUpperCase();
        // A synonym that itself encodes a variant ("787-9", "737-800").
        const inner = syn.match(/^(?:b|a)?\d{3}-(\d{1,3})$/i);
        if (inner) variant = inner[1];
        break;
      }
    }
  }
  return { models: [...models], variant };
}

export function extractRequirement(query: string, now = new Date()): Requirement {
  const raw = query.trim();
  const searchText = readAsEnglish(raw);
  const text = ` ${searchText} `;

  const { models, variant } = parseAircraft(searchText);

  const engines = ENGINES
    .filter((e) => e.canonical !== 'APU' && e.patterns.some((p) => p.test(searchText)))
    .map((e) => e.canonical);
  // Keep only the most specific engine mention (ENGINES is ordered specific-first).
  const engine = engines.length ? [engines[0]!] : [];
  // "GE engines" on a 787 can only mean the GEnx; only an unambiguous pairing is resolved.
  const brand = engine.length || models.length !== 1 ? null : engineBrand(searchText);
  const byBrand = brand ? engineForBrand(brand, models[0]!, variant) : null;
  if (byBrand) engine.push(byBrand);

  const applications = APPLICATIONS
    .filter((a) => a.patterns.some((p) => p.test(searchText)))
    .map((a) => a.canonical);

  const itemsNamed = ITEM_TYPES
    .filter((i) => i.patterns.some((p) => p.test(searchText)))
    .map((i) => i.canonical);
  // "wing stand" is the requirement; the bare "stand" inside it is not a second one.
  const itemTypes = itemsNamed.filter((t) => !itemsNamed.some((o) => o !== t && o.endsWith(` ${t}`)));

  const maintenanceCategories = MAINTENANCE_TERMS
    .filter(([, re]) => re.test(searchText))
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
    (searchText.match(/\b[A-Z]{0,2}\d{4,6}-\d{1,4}\b/gi) ?? []).map((s) => s.toUpperCase()),
  )];

  const { days, phrase } = parseLeadTime(searchText, now);

  const keywords = (searchText.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [])
    .filter((w) => !STOP.has(w));

  const understood: Requirement['understood'] = [];
  if (searchText !== raw) understood.push({ label: 'Read as English', value: searchText });
  if (models.length) {
    understood.push({
      label: 'Aircraft identified',
      value: models.join(', '),
      note: variant
        ? `Requirement mentions the ${withVariant(models[0]?.split(' ').pop() ?? '', variant)} variant. ` +
          `The catalogue records applicability at model level only.`
        : undefined,
    });
  }
  if (engine.length) {
    understood.push({
      label: 'Engine identified',
      value: engine.join(', '),
      note: byBrand
        ? `Read from “${brand}” on the ${variant ? withVariant(titleWords(models[0]!), variant) : titleWords(models[0]!)}: its only ${brand} engine.`
        : undefined,
    });
  }
  if (applications.length) {
    understood.push({ label: 'Maintenance application identified', value: applications.join(', ') });
  }
  if (itemTypes.length) understood.push({ label: 'Item identified', value: itemTypes.join(', ') });
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
    searchText,
    aircraftModels: models,
    aircraftVariantRequested: variant,
    manufacturers: [...new Set(manufacturers)],
    engines: engine,
    applications,
    itemTypes,
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
  const parts: string[] = [req.searchText];
  for (const a of req.applications) {
    const entry = APPLICATIONS.find((x) => x.canonical === a);
    if (entry) parts.push(entry.expand.join(' '));
  }
  parts.push(...req.aircraftModels, ...req.engines, ...req.maintenanceCategories);
  return parts.join(' ');
}

/** "BOEING 787" → "Boeing 787". */
const titleWords = (s: string) =>
  s.split(' ').map((w) => (/\d/.test(w) ? w : w[0] + w.slice(1).toLowerCase())).join(' ');

/** "Boeing 787" + "9" → "Boeing 787-9"; "Boeing 737" + "MAX" → "Boeing 737 MAX". */
export function withVariant(model: string, variant: string): string {
  if (/^\d/.test(variant)) return `${model}-${variant}`;
  return variant === 'X' ? `${model}X` : `${model} ${variant}`;
}

/* ------------------------------------------------------------ engine brands */

type Brand = 'GE' | 'Rolls-Royce' | 'Pratt & Whitney';

function engineBrand(t: string): Brand | null {
  if (/\bGE\b/.test(t) || /general electric/i.test(t)) return 'GE';
  if (/rolls[\s-]?royce|\brolls\b/i.test(t) || /\bRR\b/.test(t)) return 'Rolls-Royce';
  if (/\bpratt\b/i.test(t) || /\bP&W\b|\bPW\b/.test(t)) return 'Pratt & Whitney';
  return null;
}

/**
 * The engine a manufacturer's name must mean on a given aircraft. Only pairs
 * with a single answer are listed; anything ambiguous stays unresolved rather
 * than guessed.
 */
function engineForBrand(brand: Brand, model: string, variant: string | null): string | null {
  const v = variant ?? '';
  const table: Record<Brand, Record<string, string | ((v: string) => string | null)>> = {
    GE: {
      'BOEING 787': 'GEnx',
      'BOEING 777': (x) => (x === 'X' ? 'GE9X' : 'GE90'),
      'BOEING 747': (x) => (x === '8' ? 'GEnx' : x ? 'CF6' : null),
      'BOEING 767': 'CF6',
      'AIRBUS A330': 'CF6',
      'MD-11': 'CF6',
      'DC-10': 'CF6',
    },
    'Rolls-Royce': {
      'BOEING 787': 'Trent 1000',
      'BOEING 777': (x) => (x === 'X' ? null : 'Trent 800'),
      'AIRBUS A330': (x) => (x === 'NEO' ? null : 'Trent 700'),
      'AIRBUS A350': 'Trent XWB',
      'AIRBUS A380': 'Trent 900',
      'BOEING 757': 'RB211',
    },
    'Pratt & Whitney': {
      'BOEING 777': 'PW4000',
      'BOEING 767': 'PW4000',
      'AIRBUS A330': 'PW4000',
      'BOEING 757': 'PW2000',
      'AIRBUS A320': (x) => (x === 'NEO' ? 'PW1100G' : null),
      'AIRBUS A321': (x) => (x === 'NEO' ? 'PW1100G' : null),
      'MD-80': 'JT8D',
      'MD-87': 'JT8D',
      'DC-9': 'JT8D',
    },
  };
  const hit = table[brand][model];
  return typeof hit === 'function' ? hit(v) : hit ?? null;
}

/* ------------------------------------------------------------- other languages */

/** Whole words only, with accented letters treated as letters. */
const word = (src: string) => new RegExp(`(?<![\\p{L}\\d])(?:${src})(?![\\p{L}\\d])`, 'giu');

// Unambiguous terms: any one of these means the request isn't in English.
const GLOSSARY: Array<[RegExp, string]> = [
  // French
  [word("trains? d['’]atterrissage"), 'landing gear'],
  [word('inverseurs? de poussée'), 'thrust reverser'],
  [word('vérins? de levage|vérins?|crics?'), 'jack'],
  [word('élingues?'), 'sling'],
  [word('outillages?|outils'), 'tooling'],
  [word('stabilisateurs?'), 'stabilizer'],
  [word('barres? de remorquage'), 'towbar'],
  [word('carburant'), 'fuel'],
  [word('semaines?'), 'weeks'],
  // German
  [word('fahrwerke?s?'), 'landing gear'],
  [word('schubumkehr(?:er|s)?'), 'thrust reverser'],
  [word('triebwerke?s?'), 'engine'],
  [word('wagenheber|hebeb(?:o|ö)cke?'), 'jack'],
  [word('werkzeuge?'), 'tooling'],
  [word('wochen'), 'weeks'],
  [word('innerhalb(?: von)?'), 'within'],
  // Spanish
  [word('trene?s? de aterrizaje'), 'landing gear'],
  [word('inversore?s? de empuje'), 'thrust reverser'],
  [word('herramientas?|utillaje'), 'tooling'],
  [word('semanas'), 'weeks'],
];

// Words that are only safe to translate once the text is known not to be English.
const WEAK: Array<[RegExp, string]> = [
  [word('moteurs?|motor(?:es)?'), 'engine'],
  [word('portes?|puertas?|türen?'), 'door'],
  [word('jours?|días?|tagen?'), 'days'],
  [word('mois|meses|monaten?'), 'months'],
  [word("d['’]ici|dans|sous|dentro de|en menos de"), 'within'],
  [word('gatos?'), 'jack'],
];

/** Maintenance vocabulary in French, German or Spanish, read as English before matching. */
export function readAsEnglish(text: string): string {
  let out = text;
  let foreign = false;
  for (const [re, en] of GLOSSARY) {
    if (re.test(out)) { foreign = true; out = out.replace(re, en); }
    re.lastIndex = 0;
  }
  if (foreign) for (const [re, en] of WEAK) { out = out.replace(re, en); re.lastIndex = 0; }
  return out;
}
