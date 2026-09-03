/**
 * Structured search (brief §16A): SQL over the catalogue's own fields.
 * Structured data answers structured facts — no embedding is involved here.
 */
import { db } from '../db/client.ts';
import type { Requirement } from '../ai/requirement.ts';

export interface StructuredFilters {
  aircraftModels?: string[];
  manufacturers?: string[];
  engines?: string[];
  maintenanceCategories?: string[];
  partNumber?: string;
  maxLeadTimeDays?: number;
  /** Include products whose lead time the catalogue does not publish. */
  includeUnknownLeadTime?: boolean;
  text?: string;
  limit?: number;
  offset?: number;
}

export interface StructuredHit { id: string; matched: string[] }

/**
 * Returns candidates satisfying hard catalogue constraints. Deliberately
 * permissive: it collects anything that satisfies ANY strong constraint, and
 * ranking decides ordering later.
 */
export function structuredSearch(f: StructuredFilters): StructuredHit[] {
  const where: string[] = [];
  const params: any[] = [];

  if (f.partNumber) {
    where.push('UPPER(p.part_number) = UPPER(?)');
    params.push(f.partNumber);
  }

  if (f.aircraftModels?.length) {
    const ph = f.aircraftModels.map(() => 'p.aircraft_model LIKE ?').join(' OR ');
    where.push(`(${ph})`);
    params.push(...f.aircraftModels.map((m) => `%${m}%`));
  }

  if (f.manufacturers?.length) {
    const ph = f.manufacturers.map(() => 'UPPER(p.manufacturer) = UPPER(?)').join(' OR ');
    where.push(`(${ph})`);
    params.push(...f.manufacturers);
  }

  if (f.maintenanceCategories?.length) {
    const ph = f.maintenanceCategories.map(() => 'UPPER(p.maintenance_category) LIKE UPPER(?)').join(' OR ');
    where.push(`(${ph})`);
    params.push(...f.maintenanceCategories.map((c) => `%${c}%`));
  }

  if (f.engines?.length) {
    const ph = f.engines.map(() => 'UPPER(p.engine) = UPPER(?)').join(' OR ');
    where.push(`(${ph})`);
    params.push(...f.engines);
  }

  if (f.maxLeadTimeDays !== undefined) {
    where.push(
      f.includeUnknownLeadTime === false
        ? 'p.lead_time_days IS NOT NULL AND p.lead_time_days <= ?'
        : '(p.lead_time_days IS NULL OR p.lead_time_days <= ?)',
    );
    params.push(f.maxLeadTimeDays);
  }

  if (f.text) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.application LIKE ?)');
    const like = `%${f.text}%`;
    params.push(like, like, like);
  }

  const sql = `SELECT p.id FROM products p
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    LIMIT ? OFFSET ?`;
  params.push(f.limit ?? 400, f.offset ?? 0);

  const rows = db().prepare(sql).all(...params) as any[];
  return rows.map((r) => ({ id: String(r.id), matched: [] }));
}

/** Constraint set derived from an extracted requirement. */
export function filtersFromRequirement(req: Requirement): StructuredFilters {
  return {
    aircraftModels: req.aircraftModels,
    manufacturers: req.manufacturers.length ? req.manufacturers : undefined,
    maintenanceCategories: req.maintenanceCategories.length ? req.maintenanceCategories : undefined,
    partNumber: req.partNumbers[0],
    limit: 600,
  };
}

export interface FacetCount { value: string; count: number }

export function facets(f: StructuredFilters): {
  manufacturers: FacetCount[];
  aircraftModels: FacetCount[];
  maintenanceCategories: FacetCount[];
} {
  const q = (col: string, limit: number) =>
    db().prepare(
      `SELECT ${col} v, COUNT(*) c FROM products
       WHERE ${col} IS NOT NULL AND ${col} <> ''
       GROUP BY ${col} ORDER BY c DESC LIMIT ${limit}`,
    ).all().map((r: any) => ({ value: String(r.v), count: Number(r.c) }));

  return {
    manufacturers: q('manufacturer', 20),
    aircraftModels: q('aircraft_model', 40),
    maintenanceCategories: q('maintenance_category', 40),
  };
}
