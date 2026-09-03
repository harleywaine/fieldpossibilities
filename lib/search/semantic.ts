/**
 * Semantic retrieval over the persisted vector index.
 *
 * Cosine similarity is computed through the inverted index, so only documents
 * sharing a term with the query are touched — a few milliseconds across the
 * whole catalogue, with no network call and no per-query cost.
 */
import { db } from '../db/client.ts';

export interface SemanticHit { id: string; score: number }

let vocabCache: Map<string, { id: number; idf: number }> | null = null;
let normCache: Map<string, number> | null = null;

function norms(): Map<string, number> {
  if (normCache) return normCache;
  normCache = new Map(
    (db().prepare('SELECT product_id, norm FROM product_vectors').all() as any[])
      .map((r) => [String(r.product_id), Number(r.norm)]),
  );
  return normCache;
}

function vocab(): Map<string, { id: number; idf: number }> {
  if (vocabCache) return vocabCache;
  const rows = db().prepare('SELECT term, term_id, idf FROM embedding_vocab').all() as any[];
  vocabCache = new Map(rows.map((r) => [r.term as string, { id: Number(r.term_id), idf: Number(r.idf) }]));
  return vocabCache;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []).filter((t) => t.length > 1);
}

export function semanticSearch(text: string, limit = 300): SemanticHit[] {
  let v: Map<string, { id: number; idf: number }>;
  try {
    v = vocab();
  } catch {
    return []; // index not built yet
  }
  if (v.size === 0) return [];

  // Build the query vector in the same TF-IDF space as the documents.
  const counts = new Map<number, { tf: number; idf: number }>();
  for (const tok of tokenize(text)) {
    const entry = v.get(tok);
    if (!entry) continue;
    const cur = counts.get(entry.id);
    if (cur) cur.tf++;
    else counts.set(entry.id, { tf: 1, idf: entry.idf });
  }
  if (counts.size === 0) return [];

  const qWeights = new Map<number, number>();
  let qNorm = 0;
  for (const [termId, { tf, idf }] of counts) {
    const w = (1 + Math.log(tf)) * idf;
    qWeights.set(termId, w);
    qNorm += w * w;
  }
  qNorm = Math.sqrt(qNorm) || 1;

  // Accumulate dot products via postings.
  const termIds = [...qWeights.keys()];
  const ph = termIds.map(() => '?').join(',');
  const postings = db().prepare(
    `SELECT term_id, product_id, weight FROM inverted_index WHERE term_id IN (${ph})`,
  ).all(...termIds) as any[];

  const dots = new Map<string, number>();
  for (const p of postings) {
    const qw = qWeights.get(Number(p.term_id)) ?? 0;
    const id = String(p.product_id);
    dots.set(id, (dots.get(id) ?? 0) + qw * Number(p.weight));
  }
  if (dots.size === 0) return [];

  const docNorms = norms();

  const hits: SemanticHit[] = [];
  for (const [id, dot] of dots) {
    const dn = docNorms.get(id) ?? 1;
    hits.push({ id, score: dot / (qNorm * dn) });
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, limit);
  const best = top[0]?.score || 1;
  return top.map((h) => ({ id: h.id, score: h.score / best }));
}

export function embeddingInfo(): { model: string | null; createdAt: string | null; vectors: number } {
  try {
    const r = db().prepare(
      'SELECT embedding_model m, embedding_created_at c, COUNT(*) n FROM product_vectors',
    ).get() as any;
    return { model: r?.m ?? null, createdAt: r?.c ?? null, vectors: Number(r?.n ?? 0) };
  } catch {
    return { model: null, createdAt: null, vectors: 0 };
  }
}
