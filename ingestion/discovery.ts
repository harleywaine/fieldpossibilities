/**
 * URL discovery (brief §5): robots.txt, sitemap index, nested sitemaps and the
 * catalogue taxonomy. Nothing here hard-codes a page list — every URL is found
 * by following the site's own published structure.
 */
import { CONFIG } from './config.ts';
import { politeFetch, fetchJson, mapPool } from './http.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('discovery');

export interface RobotsRules {
  disallow: string[];
  sitemaps: string[];
  raw: string;
}

/** Parses the `User-agent: *` group; we never impersonate a named bot. */
export async function fetchRobots(): Promise<RobotsRules> {
  const res = await politeFetch(`${CONFIG.origin}/robots.txt`);
  const rules: RobotsRules = { disallow: [], sitemaps: [], raw: res.body };
  if (!res.ok) {
    log.warn('robots.txt unavailable — proceeding with conservative defaults');
    return rules;
  }

  let inStar = false;
  for (const line of res.body.split(/\r?\n/)) {
    const clean = line.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const [rawKey, ...rest] = clean.split(':');
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') inStar = value === '*';
    else if (key === 'sitemap') rules.sitemaps.push(value);
    else if (key === 'disallow' && inStar && value) rules.disallow.push(value);
  }

  log.info(
    `robots.txt: ${rules.disallow.length} disallow rules for *, ${rules.sitemaps.length} sitemap refs`,
  );
  return rules;
}

/** Wildcard-aware robots path matching. */
export function isAllowed(url: string, rules: RobotsRules): boolean {
  let path: string;
  try {
    path = new URL(url).pathname + new URL(url).search;
  } catch {
    return false;
  }
  return !rules.disallow.some((rule) => {
    const pattern = rule
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${pattern}`).test(path);
  });
}

function extractTags(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?\\s*</${tag}>`, 'gis');
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
  sitemap: string;
}

/** Walks the sitemap index recursively, returning every leaf URL with its lastmod. */
export async function discoverSitemapUrls(seeds: string[]): Promise<SitemapEntry[]> {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const queue = [...new Set(seeds.length ? seeds : [`${CONFIG.origin}/sitemap.xml`])];

  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const fetched = await mapPool(batch, async (sm) => {
      if (seen.has(sm)) return null;
      seen.add(sm);
      const res = await politeFetch(sm);
      return res.ok ? { sm, xml: res.body } : null;
    });

    for (const item of fetched) {
      if (!item) continue;
      const { sm, xml } = item;

      // A <sitemapindex> nests further sitemaps; a <urlset> holds leaf URLs.
      if (/<sitemapindex/i.test(xml)) {
        const children = extractTags(xml, 'loc');
        log.info(`sitemap index ${sm.split('/').pop()} → ${children.length} child sitemaps`);
        for (const c of children) if (!seen.has(c)) queue.push(c);
        continue;
      }

      // Pair each <url> block's loc with its lastmod.
      const blocks = xml.split(/<url>/i).slice(1);
      for (const b of blocks) {
        const loc = extractTags(b, 'loc')[0];
        if (!loc) continue;
        entries.push({ loc, lastmod: extractTags(b, 'lastmod')[0] ?? null, sitemap: sm });
      }
      log.info(`sitemap ${sm.split('/').pop()} → ${blocks.length} urls`);
    }
  }

  return entries;
}

export interface TaxonomyTerm {
  taxonomy: string;
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number | null;
  link: string | null;
  description: string | null;
}

/** Pulls the real taxonomy from the site rather than hard-coding it (brief §12). */
export async function discoverTaxonomies(): Promise<TaxonomyTerm[]> {
  const terms: TaxonomyTerm[] = [];

  for (const tax of CONFIG.taxonomies) {
    let page = 1;
    while (true) {
      const url =
        `${CONFIG.origin}${CONFIG.api.wp}/${tax}` +
        `?per_page=${CONFIG.api.perPage}&page=${page}&_fields=id,name,slug,count,parent,link,description`;
      const { data } = await fetchJson<any[]>(url);
      if (!Array.isArray(data) || data.length === 0) break;

      for (const t of data) {
        terms.push({
          taxonomy: tax,
          id: t.id,
          name: decodeEntities(String(t.name ?? '')),
          slug: t.slug ?? '',
          count: Number(t.count ?? 0),
          parent: typeof t.parent === 'number' ? t.parent : null,
          link: t.link ?? null,
          description: t.description ? decodeEntities(String(t.description)) : null,
        });
      }
      if (data.length < CONFIG.api.perPage) break;
      page++;
    }
    const n = terms.filter((t) => t.taxonomy === tax).length;
    log.info(`taxonomy ${tax}: ${n} terms`);
  }

  return terms;
}

/** WordPress serves HTML entities inside JSON string fields. */
export function decodeEntities(s: string): string {
  if (!s) return s;
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”', hellip: '…', deg: '°', times: '×',
    frac12: '½', frac14: '¼', frac34: '¾', middot: '·', bull: '•',
    eacute: 'é', reg: '®', copy: '©', trade: '™', euro: '€', pound: '£',
  };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => named[n.toLowerCase()] ?? m);
}

export type UrlKind = 'product' | 'catalogue' | 'taxonomy' | 'other';

/** Classifies a discovered URL so we crawl catalogue material and skip the rest. */
export function classifyUrl(url: string): UrlKind {
  let p: string;
  try {
    p = new URL(url).pathname;
  } catch {
    return 'other';
  }
  if (p.startsWith('/product/')) return 'product';
  if (p.startsWith('/gse-and-tools')) return 'catalogue';
  if (
    p.startsWith('/product-category/') ||
    p.startsWith('/aircraft-model/') ||
    p.startsWith('/product-tag/') ||
    p.startsWith('/condition/') ||
    p.startsWith('/stock-location/')
  ) {
    return 'taxonomy';
  }
  return 'other';
}
