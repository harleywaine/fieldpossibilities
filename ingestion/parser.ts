/**
 * HTML parsing for individual product pages.
 *
 * Field's product template renders a specification table whose values are NOT
 * exposed by either REST API — most importantly "Lead Time (days)". That table
 * is the reason the crawler visits every product page.
 */
import { decodeEntities } from './discovery.ts';

const stripTags = (s: string) =>
  decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|tr|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export interface SpecTable {
  [label: string]: string;
}

/**
 * Extracts every `<strong>Label:</strong></td><td>Value</td>` pair. Parsing the
 * table generically means a new row on Field's side is captured automatically
 * rather than silently dropped.
 */
export function parseSpecTable(html: string): SpecTable {
  const out: SpecTable = {};
  const re =
    /<td[^>]*>\s*<strong>\s*([^<:]+?)\s*:?\s*<\/strong>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const label = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
    if (label) out[label] = stripTags(m[2]);
  }
  return out;
}

/** `L: 120 x W: 40 x H: 35` → normalised string, or null when the template is blank. */
export function parseDimensions(raw: string | undefined): string | null {
  if (!raw) return null;
  const nums = raw.match(/([LWH])\s*:\s*([\d.]+)/gi);
  if (!nums || nums.length === 0) return null;
  const parts = nums
    .map((n) => {
      const mm = n.match(/([LWH])\s*:\s*([\d.]+)/i);
      return mm ? `${mm[1].toUpperCase()}: ${mm[2]}` : null;
    })
    .filter(Boolean);
  return parts.length ? `${parts.join(' × ')} cm` : null;
}

export function parseLeadTimeDays(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseWeight(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/([\d.]+)/);
  return m ? `${m[1]} kg` : null;
}

/** Non-empty, non-placeholder cell value. */
export function cell(t: SpecTable, ...labels: string[]): string | null {
  for (const l of labels) {
    const key = Object.keys(t).find((k) => k.toLowerCase() === l.toLowerCase());
    if (!key) continue;
    const v = t[key]?.trim();
    if (v && !/^(n\/a|none|-|—)$/i.test(v)) return v;
  }
  return null;
}

export interface DescriptionFacts {
  aircraftApplication: string | null;
  maintenanceCategory: string | null;
}

/**
 * Field's descriptions embed two semi-structured lines. Note the source's own
 * spelling variants ("MAINTENACE") — matched deliberately, not corrected blindly.
 */
export function parseDescriptionFacts(text: string): DescriptionFacts {
  const flat = text.replace(/\r/g, '');

  const appMatch = flat.match(
    /AIRCRAFT\s+APPLICATION\s*:?\s*\n?\s*([^\n]*)/i,
  );
  const catMatch = flat.match(
    /MAINTEN[AE]N?CE\s+CATEGOR(?:Y|IES)\s*:?\s*\n?\s*([^\n]*)/i,
  );

  const clean = (v: string | undefined) => {
    if (!v) return null;
    const s = v.replace(/[.;]+$/, '').trim();
    return s.length ? s : null;
  };

  return {
    aircraftApplication: clean(appMatch?.[1]),
    maintenanceCategory: clean(catMatch?.[1]),
  };
}

/** Converts a WordPress rendered-HTML body to readable plain text. */
export function htmlToText(html: string): string {
  return stripTags(html);
}

/** Yoast JSON-LD gives a canonical URL and modified date for provenance. */
export function parseJsonLd(html: string): Record<string, any> | null {
  const m = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Product-page links back into the catalogue, used to widen URL discovery. */
export function extractLinks(html: string, origin: string): string[] {
  const out = new Set<string>();
  const re = /href\s*=\s*"([^"#?]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    if (href.startsWith('/')) out.add(origin + href);
    else if (href.startsWith(origin)) out.add(href);
  }
  return [...out];
}
