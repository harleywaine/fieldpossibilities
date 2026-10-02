/**
 * Variant-level applicability, read from the "AIRCRAFT APPLICATION" line that
 * most of Field's product descriptions carry (5,147 of 8,316 records):
 *
 *   "737-100, 200, 300, 400, 500"   "737-600, 700, 800, 900"   "B737-8, 9, 10, 8200"
 *   "B777-200, 300"                 "747-8"                    "B787"
 *
 * The structured record stops at the model ("BOEING 737"). The description
 * usually goes further, and it is the only place the catalogue says whether a
 * 737 tool is for the Classic, the NG or the MAX. Nothing is inferred: a record
 * that lists no variants stays "unstated".
 */

export interface VariantApplicability {
  /** The line as written, tidied. */
  text: string;
  /** Family → variant tokens, lower case: "737" → ["600", "700", "800", "900"]. */
  families: Map<string, string[]>;
}

export type VariantFit = 'established' | 'contradicted' | 'unstated';

const LINE = /AIRCRAFT APPLICATION\s*:?\s*([^\n]+)/i;

export function parseApplicability(description: string | null | undefined): VariantApplicability | null {
  if (!description) return null;
  const m = description.match(LINE);
  if (!m) return null;
  const text = m[1]!.replace(/[¬¨‚Ä†]+/g, ' ').replace(/\s+/g, ' ').replace(/\s*&\s*/g, ', ').trim();
  const families = new Map<string, string[]>();
  let current: string | null = null;

  for (const raw of text.toLowerCase().split(/[\s,]+/)) {
    const tok = raw.replace(/^(boeing|airbus)$/, '').replace(/\.$/, '');
    if (!tok) continue;
    // "737-100", "b777-200", "a320neo", "b787", "777", "a321-"
    const fam = tok.match(/^b?(a?\d{3})(?:-?(.*))?$/);
    if (fam && (fam[1]!.startsWith('a') || /^7\d7$/.test(fam[1]!))) {
      current = fam[1]!;
      if (!families.has(current)) families.set(current, []);
      if (fam[2]) families.get(current)!.push(fam[2]);
      continue;
    }
    if (!current) continue;
    const list = families.get(current)!;
    // "-700", "700", "8200", "300er", "neo", "all"
    const variant = tok.match(/^-?(\d{1,4}[a-z]{0,3}|neo|all)$/);
    if (variant) { list.push(variant[1]!); continue; }
    // A bare suffix after a space: "300 er" → "300er".
    if (/^(er|lr|f)$/.test(tok) && list.length) list[list.length - 1] = `${list[list.length - 1]}${tok}`;
  }
  return { text, families };
}

const MAX_737 = new Set(['7', '8', '9', '10', '8200']);
const NG_737 = new Set(['600', '700', '800', '900']);

/** Does the record's own applicability line cover the variant the customer named? */
export function variantFit(app: VariantApplicability | null, model: string, variant: string): VariantFit {
  const family = model.split(' ').pop()!.toLowerCase();
  const listed = app?.families.get(family);
  if (!listed || !listed.length) return 'unstated';
  if (listed.includes('all')) return 'established';
  const v = variant.toLowerCase();
  const number = (t: string) => t.replace(/[a-z]+$/, '');
  const has = (set: Set<string>) => listed.some((t) => set.has(number(t)));
  if (v === 'max') return has(MAX_737) ? 'established' : 'contradicted';
  if (v === 'ng') return has(NG_737) ? 'established' : 'contradicted';
  if (v === 'neo') return listed.some((t) => t.includes('neo')) ? 'established' : 'contradicted';
  if (v === 'x') return has(new Set(['8', '9'])) ? 'established' : 'contradicted';
  const n = number(v);
  return listed.some((t) => number(t) === n) ? 'established' : 'contradicted';
}

/** "737" + ["600","700","800","900"] → "737-600, -700, -800, -900". */
export function describeListed(app: VariantApplicability, model: string): string {
  const family = model.split(' ').pop()!.toLowerCase();
  const listed = app.families.get(family) ?? [];
  const fam = family.toUpperCase();
  if (!listed.length) return `${fam} (no variant stated)`;
  if (listed.includes('all')) return `all ${fam} variants`;
  return `${fam}-${listed.map((t) => t.toUpperCase()).join(', -')}`;
}
