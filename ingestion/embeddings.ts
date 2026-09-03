/**
 * Semantic index (brief §17).
 *
 * Embeddings are produced through a provider interface so a hosted embedding
 * model can be swapped in without touching retrieval. The default provider is a
 * local TF-IDF vector space built from the catalogue itself: deterministic, free
 * to run, no network at demo time, and well suited to a closed 8k-document
 * corpus with a tight domain vocabulary.
 *
 * Vectors are stored sparse with an inverted index, which is both smaller and
 * more accurate than hashing into fixed dense dimensions at this corpus size.
 */
import type { DatabaseSync } from 'node:sqlite';
import type { NormalisedProduct } from './normalise.ts';
import { searchDocument } from './normalise.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('embeddings');

export interface SparseVector { terms: Map<number, number>; norm: number }

export interface EmbeddingProvider {
  readonly model: string;
  build(docs: Array<{ id: string; text: string }>): Promise<Map<string, SparseVector>>;
  embedQuery(text: string): SparseVector;
}

/** Tokeniser shared by indexing and querying so the spaces stay aligned. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [])
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'has', 'have',
  'not', 'but', 'all', 'any', 'can', 'may', 'will', 'per', 'its', 'our', 'you',
  'product', 'products', 'equipment', 'item', 'please', 'note', 'notes',
]);

export class LocalTfidfProvider implements EmbeddingProvider {
  readonly model = 'local-tfidf-v1';
  private vocab = new Map<string, number>();
  private idf = new Map<number, number>();
  private docCount = 0;

  async build(docs: Array<{ id: string; text: string }>): Promise<Map<string, SparseVector>> {
    this.docCount = docs.length;
    const df = new Map<number, number>();
    const tokenised: Array<{ id: string; counts: Map<number, number> }> = [];

    for (const d of docs) {
      const counts = new Map<number, number>();
      const seen = new Set<number>();
      for (const tok of tokenize(d.text)) {
        let id = this.vocab.get(tok);
        if (id === undefined) {
          id = this.vocab.size;
          this.vocab.set(tok, id);
        }
        counts.set(id, (counts.get(id) ?? 0) + 1);
        seen.add(id);
      }
      for (const id of seen) df.set(id, (df.get(id) ?? 0) + 1);
      tokenised.push({ id: d.id, counts });
    }

    for (const [id, n] of df) {
      this.idf.set(id, Math.log((this.docCount + 1) / (n + 0.5)) + 1);
    }

    const vectors = new Map<string, SparseVector>();
    for (const { id, counts } of tokenised) {
      const terms = new Map<number, number>();
      let sumSq = 0;
      for (const [termId, tf] of counts) {
        const w = (1 + Math.log(tf)) * (this.idf.get(termId) ?? 1);
        terms.set(termId, w);
        sumSq += w * w;
      }
      const norm = Math.sqrt(sumSq) || 1;
      // Keep the most informative terms — trims index size with negligible recall loss.
      const top = [...terms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80);
      vectors.set(id, { terms: new Map(top), norm });
    }

    log.info(`vocabulary ${this.vocab.size} terms over ${this.docCount} documents`);
    return vectors;
  }

  embedQuery(text: string): SparseVector {
    const counts = new Map<number, number>();
    for (const tok of tokenize(text)) {
      const id = this.vocab.get(tok);
      if (id === undefined) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const terms = new Map<number, number>();
    let sumSq = 0;
    for (const [termId, tf] of counts) {
      const w = (1 + Math.log(tf)) * (this.idf.get(termId) ?? 1);
      terms.set(termId, w);
      sumSq += w * w;
    }
    return { terms, norm: Math.sqrt(sumSq) || 1 };
  }

  exportVocab(): Array<{ term: string; term_id: number; idf: number }> {
    return [...this.vocab.entries()].map(([term, term_id]) => ({
      term, term_id, idf: this.idf.get(term_id) ?? 1,
    }));
  }
}

export function createEmbeddingSchema(db: DatabaseSync): void {
  db.exec(`
    DROP TABLE IF EXISTS embedding_vocab;
    DROP TABLE IF EXISTS product_vectors;
    DROP TABLE IF EXISTS inverted_index;
    CREATE TABLE embedding_vocab (
      term TEXT PRIMARY KEY, term_id INTEGER NOT NULL, idf REAL NOT NULL
    );
    CREATE TABLE product_vectors (
      product_id TEXT PRIMARY KEY,
      norm REAL NOT NULL,
      embedding_model TEXT NOT NULL,
      embedding_created_at TEXT NOT NULL,
      term_count INTEGER
    );
    CREATE TABLE inverted_index (
      term_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      weight REAL NOT NULL,
      PRIMARY KEY (term_id, product_id)
    );
    CREATE INDEX idx_inverted_term ON inverted_index(term_id);
  `);
}

export async function buildVectorIndex(
  db: DatabaseSync,
  products: NormalisedProduct[],
  provider: EmbeddingProvider = new LocalTfidfProvider(),
): Promise<void> {
  createEmbeddingSchema(db);

  const docs = products.map((p) => ({ id: p.id, text: searchDocument(p) }));
  const vectors = await provider.build(docs);
  const createdAt = new Date().toISOString();

  const insVocab = db.prepare('INSERT OR REPLACE INTO embedding_vocab (term, term_id, idf) VALUES (?,?,?)');
  const insVec = db.prepare(
    'INSERT OR REPLACE INTO product_vectors (product_id, norm, embedding_model, embedding_created_at, term_count) VALUES (?,?,?,?,?)');
  const insInv = db.prepare('INSERT OR REPLACE INTO inverted_index (term_id, product_id, weight) VALUES (?,?,?)');

  db.exec('BEGIN');
  try {
    if (provider instanceof LocalTfidfProvider) {
      for (const v of provider.exportVocab()) insVocab.run(v.term, v.term_id, v.idf);
    }
    for (const [productId, vec] of vectors) {
      insVec.run(productId, vec.norm, provider.model, createdAt, vec.terms.size);
      for (const [termId, weight] of vec.terms) insInv.run(termId, productId, weight);
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  const postings = db.prepare('SELECT COUNT(*) n FROM inverted_index').get() as any;
  log.info(`vector index: ${vectors.size} vectors, ${postings.n} postings, model=${provider.model}`);
}
