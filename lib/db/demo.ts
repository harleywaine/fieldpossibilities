/** Read access to the synthetic internal dataset. Never real Field data. */
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DB_PATH = process.env.DEMO_DB ?? join(process.cwd(), 'data/demo/demo.db');
let cached: DatabaseSync | null = null;

export function demoDb(): DatabaseSync {
  if (cached) return cached;
  if (!existsSync(DB_PATH)) {
    throw new Error(
      `Synthetic dataset not found at ${DB_PATH}. Run \`npm run generate-demo-data\`.`,
    );
  }
  cached = new DatabaseSync(DB_PATH, { readOnly: true });
  return cached;
}

export function demoAvailable(): boolean {
  return existsSync(DB_PATH);
}

export interface DocumentRow {
  document_id: string; title: string; document_type: string; department: string;
  author_name: string; created_at: string; updated_at: string;
  customer_id: string | null; related_rfq_id: string | null; related_quote_id: string | null;
  supplier_id: string | null; related_parts: string; status: string; path: string;
  body: string; stale_months: number | null; conflicts_with: string | null;
}

export function getDocument(id: string): DocumentRow | null {
  return (demoDb().prepare('SELECT * FROM documents WHERE document_id = ?').get(id) as any) ?? null;
}

export function getDocuments(ids: string[]): DocumentRow[] {
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  const rows = demoDb().prepare(
    `SELECT * FROM documents WHERE document_id IN (${ph})`).all(...ids) as any[];
  const byId = new Map(rows.map((r) => [r.document_id, r]));
  return ids.map((i) => byId.get(i)).filter(Boolean) as DocumentRow[];
}

export function demoStats() {
  const n = (t: string) => Number((demoDb().prepare(`SELECT COUNT(*) n FROM ${t}`).get() as any).n);
  return {
    documents: n('documents'), chunks: n('document_chunks'),
    customers: n('customers'), employees: n('employees'), suppliers: n('suppliers'),
    rfqs: n('rfqs'), quotes: n('quotes'),
  };
}
