/**
 * Domain lexicon for the aerospace tooling catalogue.
 *
 * Every entry here exists to RECOGNISE vocabulary that already appears in
 * Field's own product text. It never adds facts to a record: if a title says
 * "GENERAL ELECTRIC GENX" we tag engine = "GEnx" and cite the title as
 * evidence. If no engine appears anywhere in the source, engine stays null.
 */

export interface LexEntry {
  canonical: string;
  patterns: RegExp[];
}

/** Engine programmes, matched only against source text. */
export const ENGINES: LexEntry[] = [
  { canonical: 'GEnx', patterns: [/\bGE\s*NX\b/i, /\bGENX\b/i, /GENERAL\s+ELECTRIC\s+GENX/i] },
  { canonical: 'GE90', patterns: [/\bGE\s?90\b/i] },
  { canonical: 'GE9X', patterns: [/\bGE\s?9X\b/i] },
  { canonical: 'CF6', patterns: [/\bCF6(?:-\d+\w*)?\b/i] },
  { canonical: 'CF34', patterns: [/\bCF34(?:-\d+\w*)?\b/i] },
  { canonical: 'CFM56', patterns: [/\bCFM\s?56(?:-\w+)?\b/i, /\bCFMI?\b(?!\w)/i] },
  { canonical: 'LEAP', patterns: [/\bLEAP(?:-1[AB])?\b/i] },
  { canonical: 'Trent 1000', patterns: [/TRENT\s*1000/i] },
  { canonical: 'Trent 700', patterns: [/TRENT\s*700/i] },
  { canonical: 'Trent 800', patterns: [/TRENT\s*800/i] },
  { canonical: 'Trent 900', patterns: [/TRENT\s*900/i] },
  { canonical: 'Trent XWB', patterns: [/TRENT\s*XWB/i] },
  { canonical: 'Trent', patterns: [/\bTRENT\b/i] },
  { canonical: 'RB211', patterns: [/\bRB\s?211(?:-\w+)?\b/i] },
  { canonical: 'PW4000', patterns: [/\bPW\s?4000\b/i, /\bPW4\d{3}\b/i] },
  { canonical: 'PW2000', patterns: [/\bPW\s?2000\b/i, /\bPW2\d{3}\b/i] },
  { canonical: 'PW1100G', patterns: [/\bPW\s?1100G?\b/i] },
  { canonical: 'JT8D', patterns: [/\bJT8D(?:-\w+)?\b/i] },
  { canonical: 'JT9D', patterns: [/\bJT9D(?:-\w+)?\b/i] },
  { canonical: 'JT3D', patterns: [/\bJT3D(?:-\w+)?\b/i] },
  { canonical: 'V2500', patterns: [/\bV\s?2500\b/i] },
  { canonical: 'APU', patterns: [/\bAPU\b/i, /AUXILIARY\s+POWER\s+UNIT/i] },
];

/**
 * Maintenance/application concepts. `expand` terms widen semantic recall for
 * natural-language queries; they are query-side synonyms only and are never
 * written into a product record.
 */
export interface ConceptEntry {
  canonical: string;
  patterns: RegExp[];
  expand: string[];
}

export const APPLICATIONS: ConceptEntry[] = [
  {
    canonical: 'Thrust reverser',
    patterns: [/THRUST\s+REVERSER/i, /\bT\/?R\b/i, /REVERSER/i],
    expand: ['thrust reverser', 'reverser', 'blocker door', 'translating sleeve', 'cascade'],
  },
  {
    canonical: 'Engine / power plant',
    patterns: [/POWER\s*PLANT/i, /\bENGINE\b/i, /NACELLE/i, /PYLON/i, /FAN\s+COWL/i, /INLET\s+COWL/i],
    expand: ['engine', 'power plant', 'nacelle', 'pylon', 'cowl', 'inlet', 'exhaust'],
  },
  {
    canonical: 'Landing gear',
    patterns: [/LANDING\s+GEAR/i, /\bMLG\b/i, /\bNLG\b/i, /\bAXLE\b/i, /\bSTRUT\b/i, /\bWHEEL\b/i, /\bBRAKE\b/i],
    expand: ['landing gear', 'undercarriage', 'gear', 'axle', 'wheel', 'brake', 'strut', 'shock'],
  },
  {
    canonical: 'Doors',
    patterns: [/\bDOORS?\b/i, /\bHATCH\b/i, /PASSENGER\s+ENTRY/i, /CARGO\s+DOOR/i],
    expand: ['door', 'hatch', 'entry', 'cargo door', 'escape'],
  },
  {
    canonical: 'Flight controls',
    patterns: [/FLIGHT\s+CONTROL/i, /\bAILERON\b/i, /\bFLAPERON\b/i, /\bRUDDER\b/i, /\bELEVATOR\b/i, /\bSLAT\b/i, /\bFLAP\b/i, /\bSPOILER\b/i],
    expand: ['flight control', 'aileron', 'flaperon', 'rudder', 'elevator', 'slat', 'flap', 'spoiler', 'rigging'],
  },
  {
    canonical: 'Stabilizers',
    patterns: [/STABILI[SZ]ER/i, /\bEMPENNAGE\b/i, /\bTAILPLANE\b/i],
    expand: ['stabilizer', 'stabiliser', 'horizontal stabilizer', 'tailplane', 'empennage'],
  },
  {
    canonical: 'Hoisting / lifting',
    patterns: [/\bSLING\b/i, /\bHOIST\b/i, /\bLIFT(?:ING)?\b/i, /\bCRANE\b/i, /\bSPREADER\b/i, /\bSHACKLE\b/i],
    expand: ['sling', 'hoist', 'lifting', 'lift', 'crane', 'spreader beam', 'shackle', 'handling'],
  },
  {
    canonical: 'Towing / ground handling',
    patterns: [/\bTOW\s?BAR\b/i, /\bTOWING\b/i, /\bTUG\b/i, /GROUND\s+HANDLING/i],
    expand: ['towbar', 'tow bar', 'towing', 'tug', 'ground handling', 'pushback'],
  },
  {
    canonical: 'Fuel',
    patterns: [/\bFUEL\b/i, /\bTANK\b/i],
    expand: ['fuel', 'fuel tank', 'refuel', 'defuel'],
  },
  {
    canonical: 'Hydraulics / pneumatics',
    patterns: [/\bHYDRAULIC\b/i, /\bPNEUMATIC\b/i, /\bACTUATOR\b/i],
    expand: ['hydraulic', 'pneumatic', 'actuator', 'pressure'],
  },
  {
    canonical: 'Structures / airframe',
    patterns: [/\bSTRUCTURE\b/i, /\bFUSELAGE\b/i, /\bAIRFRAME\b/i, /\bWING\b/i, /\bSKIN\b/i],
    expand: ['structure', 'fuselage', 'airframe', 'wing', 'skin', 'panel'],
  },
  {
    canonical: 'Parking / mooring / protection',
    patterns: [/PARKING/i, /MOORING/i, /PROTECTIVE/i, /\bCOVER\b/i, /\bPLUG\b/i, /\bBLANK\b/i],
    expand: ['protective', 'cover', 'plug', 'blank', 'parking', 'mooring', 'storage', 'preservation'],
  },
  {
    canonical: 'Measurement / test',
    patterns: [/\bGAUGE\b/i, /\bTEST\b/i, /\bDYNAMOMETER\b/i, /MEASUREMENT/i, /\bCALIBRAT/i, /\bTENSION\s?METER\b/i],
    expand: ['gauge', 'test', 'measurement', 'dynamometer', 'tension', 'calibration', 'inspection'],
  },
];

/** Aircraft vocabulary — used to map free text onto real taxonomy terms. */
export const AIRCRAFT_SYNONYMS: Record<string, string[]> = {
  'BOEING 707': ['707', 'b707'],
  'BOEING 717': ['717', 'b717'],
  'BOEING 727': ['727', 'b727'],
  'BOEING 737': ['737', 'b737', '737ng', '737 ng', '737-800', '737-700', '737-900', '737 max', '737max', '73g', '738'],
  'BOEING 747': ['747', 'b747', 'jumbo', '747-400', '747-8', '744', '748'],
  'BOEING 757': ['757', 'b757', '757-200', '757-300'],
  'BOEING 767': ['767', 'b767', '767-300', '767-200', '767-400'],
  'BOEING 777': ['777', 'b777', 'triple seven', '777-200', '777-300', '777x', '77w'],
  'BOEING 787': ['787', 'b787', 'dreamliner', '787-8', '787-9', '787-10', '789', '788'],
  'AIRBUS A319': ['a319', '319'],
  'AIRBUS A320': ['a320', '320', 'a320neo'],
  'AIRBUS A321': ['a321', '321', 'a321neo'],
  'AIRBUS A330': ['a330', '330', 'a330neo'],
  'AIRBUS A340': ['a340', '340'],
  'AIRBUS A343': ['a343', 'a340-300'],
  'AIRBUS A350': ['a350', '350', 'a350xwb'],
  'AIRBUS A380': ['a380', '380'],
  'DC-9': ['dc9', 'dc-9', 'douglas dc-9'],
  'DC-10': ['dc10', 'dc-10', 'douglas dc-10'],
  'MD-10': ['md10', 'md-10'],
  'MD-11': ['md11', 'md-11'],
  'MD-80': ['md80', 'md-80'],
  'MD-87': ['md87', 'md-87'],
  'MD-90': ['md90', 'md-90'],
};

/** Finds every lexicon hit in a block of source text. */
export function matchLexicon(text: string, entries: LexEntry[]): string[] {
  if (!text) return [];
  const hits = new Set<string>();
  for (const e of entries) {
    if (e.patterns.some((p) => p.test(text))) hits.add(e.canonical);
  }
  return [...hits];
}

export function matchConcepts(text: string, entries: ConceptEntry[]): string[] {
  if (!text) return [];
  const hits = new Set<string>();
  for (const e of entries) {
    if (e.patterns.some((p) => p.test(text))) hits.add(e.canonical);
  }
  return [...hits];
}

/**
 * Picks the single most specific engine mentioned. Ordering in ENGINES puts
 * specific variants ahead of family names so "Trent 1000" beats "Trent".
 */
export function primaryEngine(text: string): string | null {
  for (const e of ENGINES) {
    if (e.canonical === 'APU') continue;
    if (e.patterns.some((p) => p.test(text))) return e.canonical;
  }
  return null;
}
