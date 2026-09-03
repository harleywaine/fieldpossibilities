/**
 * Catalogue acquisition via the site's own public REST surfaces.
 *
 * Field runs WordPress + WooCommerce and publicly exposes both `wp/v2/product`
 * and `wc/store/v1/products`. They are keyed on the same post id, so merging
 * them yields a complete core record in ~170 requests instead of 8,300 page
 * fetches — far kinder to the origin than rendering every listing page, and
 * materially more reliable than scraping themed HTML.
 *
 * It does NOT replace the per-product HTML crawl: the specification table
 * (lead time, weight, dimensions, stock location) is template-rendered only.
 */
import { writeFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from './config.ts';
import { fetchJson, politeFetch } from './http.ts';
import { makeLogger } from './logger.ts';
import { decodeEntities } from './discovery.ts';

const log = makeLogger('catalogue');

export interface WpProduct {
  id: number;
  slug: string;
  link: string;
  status: string;
  date_gmt: string;
  modified_gmt: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  product_cat?: number[];
  product_tag?: number[];
  product_brand?: number[];
  'aircraft-model'?: number[];
  condition?: number[];
  'stock-location'?: number[];
  class_list?: string[];
}

export interface StoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku: string;
  description: string;
  short_description: string;
  images: Array<{ id: number; src: string; thumbnail: string; alt: string; name: string }>;
  categories: Array<{ id: number; name: string; slug: string; link: string }>;
  tags: Array<{ id: number; name: string; slug: string; link: string }>;
  weight: string;
  dimensions: { length: string; width: string; height: string };
  stock_availability: { text: string; class: string };
  is_in_stock: boolean;
  add_to_cart?: { text: string };
  prices?: { price: string };
}

/** Reads the authoritative product count straight from the API headers. */
export async function totalProducts(): Promise<number> {
  const res = await politeFetch(
    `${CONFIG.origin}${CONFIG.api.wp}/product?per_page=1&_fields=id`,
  );
  const n = Number(res.ok ? await headerTotal(res.url) : 0);
  return n;
}

async function headerTotal(url: string): Promise<number> {
  const r = await fetch(url, { headers: { 'User-Agent': CONFIG.userAgent } });
  return Number(r.headers.get('x-wp-total') ?? 0);
}

async function pagedFetch<T>(
  base: string,
  label: string,
  onPage?: (rows: T[], page: number) => void,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = Infinity;

  while (page <= totalPages) {
    const url = `${base}${base.includes('?') ? '&' : '?'}per_page=${CONFIG.api.perPage}&page=${page}`;
    const { data, res } = await fetchJson<T[]>(url);

    if (!res.ok || !Array.isArray(data)) {
      // WordPress returns 400 once you page past the end — a clean stop signal.
      if (res.status === 400) break;
      log.warn(`${label} page ${page} failed: ${res.error ?? res.status}`);
      break;
    }

    if (data.length === 0) break;
    all.push(...data);
    onPage?.(data, page);
    log.progress(all.length, totalPages === Infinity ? all.length : totalPages * CONFIG.api.perPage, label);

    if (data.length < CONFIG.api.perPage) break;
    page++;
    if (page > 200) break; // hard safety stop
  }
  if (process.stdout.isTTY) process.stdout.write('\n');
  log.info(`${label}: ${all.length} records over ${page} pages`);
  return all;
}

export async function fetchWpProducts(): Promise<WpProduct[]> {
  const fields = [
    'id', 'slug', 'link', 'status', 'date_gmt', 'modified_gmt', 'title', 'content',
    'excerpt', 'featured_media', 'product_cat', 'product_tag', 'product_brand',
    'aircraft-model', 'condition', 'stock-location', 'class_list',
  ].join(',');
  return pagedFetch<WpProduct>(
    `${CONFIG.origin}${CONFIG.api.wp}/product?_fields=${fields}&orderby=id&order=asc`,
    'wp/v2/product',
  );
}

export async function fetchStoreProducts(): Promise<StoreProduct[]> {
  return pagedFetch<StoreProduct>(
    `${CONFIG.origin}${CONFIG.api.store}/products?orderby=id&order=asc`,
    'store/products',
  );
}

/**
 * Reads a previously persisted raw payload when it is still fresh. Lets repeat
 * runs skip ~170 API requests, which is both faster and kinder to the origin.
 */
export function readRaw<T>(name: string, maxAgeHours = 24): T | null {
  const p = join(CONFIG.paths.rawApi, name);
  if (!existsSync(p)) return null;
  const ageH = (Date.now() - statSync(p).mtimeMs) / 3_600_000;
  if (ageH > maxAgeHours) return null;
  try {
    const data = JSON.parse(readFileSync(p, 'utf8')) as T;
    log.info(`reusing cached ${name} (${ageH.toFixed(1)}h old)`);
    return data;
  } catch {
    return null;
  }
}

/** Raw API payloads are retained as the source representation (brief §9). */
export function persistRaw(name: string, payload: unknown): void {
  writeFileSync(join(CONFIG.paths.rawApi, name), JSON.stringify(payload, null, 1));
  log.info(`raw payload saved → ${join(CONFIG.paths.rawApi, name)}`);
}

export { decodeEntities };
