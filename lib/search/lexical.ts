/** Lexical search over the FTS5 index, scored with BM25. */
import { db } from '../db/client.ts';

export interface LexicalHit { id: string; score: number }

/** FTS5 has its own query syntax; user text must be neutralised before use. */
export function toFtsQuery(text: string, mode: 'or' | 'and' = 'or'): string {
  const tokens = (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [])
    .filter((t) => t.length > 1)
    .slice(0, 32)
    .map((t) => `"${t.replace(/"/g, '')}"`);
  if (tokens.length === 0) return '';
  return tokens.join(mode === 'and' ? ' AND ' : ' OR ');
}

export function lexicalSearch(text: string, limit = 300): LexicalHit[] {
  const q = toFtsQuery(text);
  if (!q) return [];
  try {
    const rows = db().prepare(
      `SELECT product_id, bm25(products_fts, 4.0, 6.0, 5.0, 3.0, 3.0, 2.0, 2.0, 1.0) AS score
       FROM products_fts WHERE products_fts MATCH ?
       ORDER BY score LIMIT ?`,
    ).all(q, limit) as any[];

    // bm25() returns increasingly negative values for better matches.
    const best = rows.length ? Math.abs(rows[0].score) || 1 : 1;
    return rows.map((r) => ({
      id: String(r.product_id),
      score: Math.min(1, Math.abs(Number(r.score)) / best),
    }));
  } catch {
    return [];
  }
}

/** Exact/prefix part-number lookup — the highest-confidence signal available. */
export function partNumberSearch(text: string, limit = 25): LexicalHit[] {
  const cleaned = text.trim().toUpperCase();
  if (cleaned.length < 3) return [];
  const rows = db().prepare(
    `SELECT id, part_number FROM products
     WHERE UPPER(part_number) = ? OR UPPER(part_number) LIKE ?
     ORDER BY LENGTH(part_number) LIMIT ?`,
  ).all(cleaned, `${cleaned}%`, limit) as any[];
  return rows.map((r) => ({
    id: String(r.id),
    score: String(r.part_number).toUpperCase() === cleaned ? 1 : 0.8,
  }));
}
