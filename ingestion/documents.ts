/**
 * Document ingestion for the internal knowledge layer (brief §45, §52).
 *
 * Mirrors the catalogue pipeline deliberately: parse → chunk → metadata →
 * structured table + FTS + vector index. The same retrieval machinery then
 * serves both corpora, which is the "coherent platform" the brief asks for
 * rather than four unrelated demos.
 */
import type { DatabaseSync } from 'node:sqlite';
import type { DemoDataset, DemoDocument } from '../lib/demo/types.ts';
import { LocalTfidfProvider } from './embeddings.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('documents');

export function createDemoSchema(db: DatabaseSync): void {
  db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, name TEXT, country TEXT, region TEXT, type TEXT,
    fleet TEXT, account_owner_id TEXT, since TEXT, annual_spend_gbp INTEGER,
    payment_terms TEXT, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY, name TEXT, role TEXT, department TEXT, email TEXT
  );
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY, name TEXT, category TEXT, country TEXT,
    standard_lead_time_weeks INTEGER, reliability_pct INTEGER, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS rfqs (
    id TEXT PRIMARY KEY, reference TEXT, customer_id TEXT, owner_id TEXT,
    received_at TEXT, aircraft TEXT, engine TEXT, application TEXT, programme TEXT,
    required_delivery_weeks INTEGER, status TEXT, summary TEXT, line_items_json TEXT
  );
  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY, reference TEXT, rfq_id TEXT, customer_id TEXT, owner_id TEXT,
    issued_at TEXT, value_gbp INTEGER, lead_time_weeks INTEGER, status TEXT,
    line_count INTEGER, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS documents (
    document_id TEXT PRIMARY KEY, title TEXT, document_type TEXT, department TEXT,
    author_id TEXT, author_name TEXT, created_at TEXT, updated_at TEXT,
    customer_id TEXT, related_rfq_id TEXT, related_quote_id TEXT, supplier_id TEXT,
    related_parts TEXT, status TEXT, path TEXT, body TEXT,
    stale_months INTEGER, conflicts_with TEXT
  );
  CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id TEXT PRIMARY KEY, document_id TEXT NOT NULL, position INTEGER,
    text TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS metrics (
    process TEXT PRIMARY KEY, current_minutes INTEGER, ai_assisted_minutes INTEGER,
    annual_volume INTEGER, affected_employees INTEGER, complexity TEXT, department TEXT
  );
  CREATE TABLE IF NOT EXISTS roi_assumptions (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    loaded_hourly_cost_gbp REAL, working_weeks_per_year INTEGER,
    implementation_cost_gbp REAL, adoption_rate_pct REAL
  );

  /* Prototype audit trail for internal AI actions (brief §59). */
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL, actor TEXT, action TEXT, query TEXT,
    retrieved_sources TEXT, model TEXT, output_summary TEXT,
    approval_required INTEGER, approval_status TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_docs_customer ON documents(customer_id);
  CREATE INDEX IF NOT EXISTS idx_docs_type     ON documents(document_type);
  CREATE INDEX IF NOT EXISTS idx_docs_rfq      ON documents(related_rfq_id);
  CREATE INDEX IF NOT EXISTS idx_chunks_doc    ON document_chunks(document_id);
  `);
}

/** Paragraph-aware chunking with a small overlap so facts are not split apart. */
export function chunkDocument(doc: DemoDocument, maxChars = 700, overlap = 120): string[] {
  const paras = doc.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const p of paras) {
    if (current && current.length + p.length + 2 > maxChars) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlap)) + '\n\n' + p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current.trim()) chunks.push(current);

  // Every chunk carries its title so a retrieved fragment stays self-describing.
  return chunks.map((c) => `${doc.title}\n\n${c}`);
}

export function writeDemoDataset(db: DatabaseSync, data: DemoDataset): void {
  createDemoSchema(db);
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM document_chunks; DELETE FROM documents; DELETE FROM rfqs; DELETE FROM quotes; DELETE FROM customers; DELETE FROM employees; DELETE FROM suppliers; DELETE FROM metrics;');

    const c = db.prepare('INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const x of data.customers) {
      c.run(x.id, x.name, x.country, x.region, x.type, JSON.stringify(x.fleet),
            x.accountOwnerId, x.since, x.annualSpendGbp, x.paymentTerms, x.notes);
    }
    const e = db.prepare('INSERT INTO employees VALUES (?,?,?,?,?)');
    for (const x of data.employees) e.run(x.id, x.name, x.role, x.department, x.email);

    const s = db.prepare('INSERT INTO suppliers VALUES (?,?,?,?,?,?,?)');
    for (const x of data.suppliers) {
      s.run(x.id, x.name, x.category, x.country, x.standardLeadTimeWeeks, x.reliabilityPct, x.notes);
    }
    const rq = db.prepare('INSERT INTO rfqs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const x of data.rfqs) {
      rq.run(x.id, x.reference, x.customerId, x.ownerId, x.receivedAt, x.aircraft, x.engine,
             x.application, x.programme, x.requiredDeliveryWeeks, x.status, x.summary,
             JSON.stringify(x.lineItems));
    }
    const q = db.prepare('INSERT INTO quotes VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    for (const x of data.quotes) {
      q.run(x.id, x.reference, x.rfqId, x.customerId, x.ownerId, x.issuedAt, x.valueGbp,
            x.leadTimeWeeks, x.status, x.lineCount, x.notes);
    }
    const d = db.prepare('INSERT INTO documents VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    const ch = db.prepare('INSERT INTO document_chunks VALUES (?,?,?,?)');
    for (const x of data.documents) {
      d.run(x.documentId, x.title, x.documentType, x.department, x.authorId, x.authorName,
            x.createdAt, x.updatedAt, x.customerId, x.relatedRfqId, x.relatedQuoteId,
            x.supplierId, JSON.stringify(x.relatedParts), x.status, x.path, x.body,
            x.staleMonths ?? null, x.conflictsWith ?? null);
      chunkDocument(x).forEach((text, i) =>
        ch.run(`${x.documentId}#${i}`, x.documentId, i, text));
    }
    const m = db.prepare('INSERT INTO metrics VALUES (?,?,?,?,?,?,?)');
    for (const x of data.metrics) {
      m.run(x.process, x.currentMinutes, x.aiAssistedMinutes, x.annualVolume,
            x.affectedEmployees, x.complexity, x.department);
    }
    db.prepare('INSERT OR REPLACE INTO roi_assumptions VALUES (1,?,?,?,?)')
      .run(data.roi.loadedHourlyCostGbp, data.roi.workingWeeksPerYear,
           data.roi.implementationCostGbp, data.roi.adoptionRatePct);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const n = (t: string) => (db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as any).n;
  log.info(`documents ${n('documents')}, chunks ${n('document_chunks')}, rfqs ${n('rfqs')}, quotes ${n('quotes')}`);
}

/** FTS5 + TF-IDF vector index over document CHUNKS (brief §52 hybrid retrieval). */
export async function buildDocumentIndexes(db: DatabaseSync): Promise<void> {
  db.exec(`
    DROP TABLE IF EXISTS chunks_fts;
    CREATE VIRTUAL TABLE chunks_fts USING fts5(
      chunk_id UNINDEXED, document_id UNINDEXED, title, text,
      tokenize = 'porter unicode61 remove_diacritics 2'
    );
    DROP TABLE IF EXISTS chunk_vocab;
    DROP TABLE IF EXISTS chunk_vectors;
    DROP TABLE IF EXISTS chunk_inverted;
    CREATE TABLE chunk_vocab (term TEXT PRIMARY KEY, term_id INTEGER NOT NULL, idf REAL NOT NULL);
    CREATE TABLE chunk_vectors (
      chunk_id TEXT PRIMARY KEY, norm REAL NOT NULL,
      embedding_model TEXT NOT NULL, embedding_created_at TEXT NOT NULL
    );
    CREATE TABLE chunk_inverted (
      term_id INTEGER NOT NULL, chunk_id TEXT NOT NULL, weight REAL NOT NULL,
      PRIMARY KEY (term_id, chunk_id)
    );
    CREATE INDEX idx_chunk_inv_term ON chunk_inverted(term_id);
  `);

  const rows = db.prepare(`
    SELECT c.chunk_id, c.document_id, c.text, d.title
    FROM document_chunks c JOIN documents d ON d.document_id = c.document_id
  `).all() as any[];

  const insFts = db.prepare('INSERT INTO chunks_fts VALUES (?,?,?,?)');
  db.exec('BEGIN');
  for (const r of rows) insFts.run(r.chunk_id, r.document_id, r.title, r.text);
  db.exec('COMMIT');

  const provider = new LocalTfidfProvider();
  const vectors = await provider.build(rows.map((r) => ({ id: r.chunk_id, text: r.text })));
  const createdAt = new Date().toISOString();

  const insVocab = db.prepare('INSERT OR REPLACE INTO chunk_vocab VALUES (?,?,?)');
  const insVec = db.prepare('INSERT OR REPLACE INTO chunk_vectors VALUES (?,?,?,?)');
  const insInv = db.prepare('INSERT OR REPLACE INTO chunk_inverted VALUES (?,?,?)');

  db.exec('BEGIN');
  for (const v of provider.exportVocab()) insVocab.run(v.term, v.term_id, v.idf);
  for (const [chunkId, vec] of vectors) {
    insVec.run(chunkId, vec.norm, provider.model, createdAt);
    for (const [termId, weight] of vec.terms) insInv.run(termId, chunkId, weight);
  }
  db.exec('COMMIT');

  log.info(`document indexes: ${rows.length} chunks, model=${provider.model}`);
}
