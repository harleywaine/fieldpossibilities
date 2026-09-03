/** Conventional catalogue browsing (brief §42): filters, paging, facets. */
import { db, rowToProduct, imagesFor } from '../db/client.ts';
import type { Product } from './types.ts';

export interface BrowseQuery {
  manufacturer?: string;
  aircraft?: string;
  category?: string;
  engine?: string;
  text?: string;
  hasLeadTime?: boolean;
  page?: number;
  perPage?: number;
}

export interface BrowseResult {
  products: Product[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

export function browse(q: BrowseQuery): BrowseResult {
  const where: string[] = [];
  const params: any[] = [];

  if (q.manufacturer) { where.push('p.manufacturer = ?'); params.push(q.manufacturer); }
  if (q.aircraft) { where.push('p.aircraft_model LIKE ?'); params.push(`%${q.aircraft}%`); }
  if (q.category) { where.push('p.maintenance_category = ?'); params.push(q.category); }
  if (q.engine) { where.push('p.engine = ?'); params.push(q.engine); }
  if (q.hasLeadTime) where.push('p.lead_time_days IS NOT NULL');
  if (q.text) {
    where.push('(p.name LIKE ? OR p.part_number LIKE ? OR p.description LIKE ?)');
    const like = `%${q.text}%`;
    params.push(like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((db().prepare(`SELECT COUNT(*) n FROM products p ${clause}`).get(...params) as any).n);

  const perPage = Math.min(q.perPage ?? 24, 96);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);

  const rows = db().prepare(`
    SELECT p.id, p.part_number, p.part_number_in_title, p.name, p.description, p.short_description, p.manufacturer,
           p.aircraft_model, p.aircraft_variant, p.engine, p.application, p.maintenance_category,
           p.equipment_type, p.weight, p.dimensions, p.material, p.condition, p.availability,
           p.lead_time_days, p.stock_status, p.stock_location, p.ce_marked, p.product_url,
           p.source_url, p.source_domain, p.scraped_at, p.detail_crawled
    FROM products p ${clause}
    ORDER BY (p.part_number IS NULL), p.part_number
    LIMIT ? OFFSET ?
  `).all(...params, perPage, (page - 1) * perPage) as any[];

  const ids = rows.map((r) => String(r.id));
  const imgs = imagesFor(ids);
  return {
    products: rows.map((r) => rowToProduct(r, imgs.get(String(r.id)) ?? [])),
    total, page, perPage, pages,
  };
}

export interface Facet { value: string; count: number }

/** Facet counts reflect the CURRENT filter set, so they never offer dead ends. */
export function browseFacets(q: BrowseQuery): {
  manufacturers: Facet[]; aircraft: Facet[]; categories: Facet[]; engines: Facet[];
} {
  const build = (column: string, exclude: keyof BrowseQuery, limit: number): Facet[] => {
    const where: string[] = [`p.${column} IS NOT NULL`, `p.${column} <> ''`];
    const params: any[] = [];
    if (q.manufacturer && exclude !== 'manufacturer') { where.push('p.manufacturer = ?'); params.push(q.manufacturer); }
    if (q.aircraft && exclude !== 'aircraft') { where.push('p.aircraft_model LIKE ?'); params.push(`%${q.aircraft}%`); }
    if (q.category && exclude !== 'category') { where.push('p.maintenance_category = ?'); params.push(q.category); }
    if (q.engine && exclude !== 'engine') { where.push('p.engine = ?'); params.push(q.engine); }
    if (q.text) {
      where.push('(p.name LIKE ? OR p.part_number LIKE ? OR p.description LIKE ?)');
      const like = `%${q.text}%`;
      params.push(like, like, like);
    }
    return (db().prepare(
      `SELECT p.${column} v, COUNT(*) c FROM products p WHERE ${where.join(' AND ')}
       GROUP BY p.${column} ORDER BY c DESC LIMIT ${limit}`,
    ).all(...params) as any[]).map((r) => ({ value: String(r.v), count: Number(r.c) }));
  };

  return {
    manufacturers: build('manufacturer', 'manufacturer', 12),
    aircraft: build('aircraft_model', 'aircraft', 30),
    categories: build('maintenance_category', 'category', 30),
    engines: build('engine', 'engine', 20),
  };
}
