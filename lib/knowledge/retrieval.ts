/**
 * Hybrid retrieval over the internal document corpus (brief §52, §57).
 *
 *   question → intent → query rewriting → metadata filter
 *            → keyword (BM25) + vector (cosine) → fusion → rerank
 *            → context selection → citations
 *
 * Semantic search alone is not assumed sufficient: exact identifiers such as
 * RFQ-10482, QT-09841 and part numbers are matched lexically, while the
 * conceptual parts of a question are matched by vector similarity.
 */
import { demoDb, type DocumentRow } from '../db/demo.ts';

export type Intent =
  | 'enquiry-brief' | 'find-similar' | 'quote-prep' | 'draft-response'
  | 'process-question' | 'general';

export interface KnowledgeFilters {
  customerId?: string;
  documentTypes?: string[];
  department?: string;
  relatedRfqId?: string;
  supplierId?: string;
  parts?: string[];
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  text: string;
  document: DocumentRow;
  keywordScore: number;
  vectorScore: number;
  fusedScore: number;
  rerankScore: number;
  /** Which strategies surfaced this chunk — shown in the retrieval trace. */
  matchedBy: string[];
}

export interface KnowledgeResult {
  question: string;
  intent: Intent;
  rewrittenQuery: string;
  filters: KnowledgeFilters;
  chunks: RetrievedChunk[];
  documents: DocumentRow[];
  trace: {
    keywordCandidates: number;
    vectorCandidates: number;
    filteredCandidates: number;
    fused: number;
    selected: number;
    durationMs: number;
    steps: Array<{ label: string; detail: string }>;
  };
}

// ---------------------------------------------------------------- intent

const INTENT_RULES: Array<[Intent, RegExp]> = [
  ['enquiry-brief', /everything i need to know|before i respond|brief me|tell me about this (rfq|enquiry|inquiry)|new enquiry|received an enquiry/i],
  ['quote-prep', /quote|quotation|pricing|price|brief for the quote/i],
  ['draft-response', /draft|reply|respond to the customer|write .*(email|response)/i],
  ['find-similar', /similar|previous|before|history|have we|precedent|past/i],
  ['process-question', /how do we|what.s the process|procedure|policy|normally handle|standard/i],
];

export function classifyIntent(q: string): Intent {
  for (const [intent, re] of INTENT_RULES) if (re.test(q)) return intent;
  return 'general';
}

// ------------------------------------------------- metadata filter extraction

function lookupCustomer(q: string): string | undefined {
  const rows = demoDb().prepare('SELECT id, name FROM customers').all() as any[];
  const lower = q.toLowerCase();
  for (const r of rows) {
    if (lower.includes(String(r.name).toLowerCase())) return r.id;
    // Also match a distinctive leading word, e.g. "Singapore".
    const first = String(r.name).split(' ')[0].toLowerCase();
    if (first.length > 4 && lower.includes(first)) return r.id;
  }
  return undefined;
}

export function extractFilters(q: string): KnowledgeFilters {
  const f: KnowledgeFilters = {};
  const customerId = lookupCustomer(q);
  if (customerId) f.customerId = customerId;

  const rfq = q.match(/\bRFQ[-\s]?(\d{4,6})\b/i);
  if (rfq) f.relatedRfqId = `RFQ-${rfq[1]}`;

  const parts = q.match(/\b[A-Z]{1,2}\d{4,6}-\d{1,4}\b/gi);
  if (parts) f.parts = [...new Set(parts.map((p) => p.toUpperCase()))];

  return f;
}

/**
 * Query rewriting: expands the question with the domain vocabulary the corpus
 * actually uses, so a natural request reaches documents worded differently.
 */
export function rewriteQuery(q: string, intent: Intent, filters: KnowledgeFilters): string {
  const parts = [q];
  if (filters.customerId) {
    const c = demoDb().prepare('SELECT name FROM customers WHERE id = ?').get(filters.customerId) as any;
    if (c) parts.push(c.name);
  }
  const expansions: Record<Intent, string> = {
    'enquiry-brief': 'account history previous quote lead time supplier delivery owner enquiry',
    'find-similar': 'previous RFQ historical enquiry precedent quote',
    'quote-prep': 'quotation pricing lead time supplier delivery line items',
    'draft-response': 'customer correspondence acknowledgement availability delivery',
    'process-question': 'process procedure escalation standard policy',
    general: '',
  };
  parts.push(expansions[intent]);
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------- retrieval

function ftsQuery(text: string): string {
  const toks = (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [])
    .filter((t) => t.length > 1).slice(0, 40)
    .map((t) => `"${t.replace(/"/g, '')}"`);
  return toks.length ? toks.join(' OR ') : '';
}

function keywordSearch(text: string, limit: number): Map<string, number> {
  const q = ftsQuery(text);
  const out = new Map<string, number>();
  if (!q) return out;
  try {
    const rows = demoDb().prepare(
      `SELECT chunk_id, bm25(chunks_fts, 3.0, 1.0) AS score
       FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY score LIMIT ?`,
    ).all(q, limit) as any[];
    const best = rows.length ? Math.abs(rows[0].score) || 1 : 1;
    for (const r of rows) out.set(String(r.chunk_id), Math.min(1, Math.abs(r.score) / best));
  } catch { /* malformed FTS expression — fall back to vector only */ }
  return out;
}

let vocabCache: Map<string, { id: number; idf: number }> | null = null;
let normCache: Map<string, number> | null = null;

function vectorSearch(text: string, limit: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!vocabCache) {
    vocabCache = new Map((demoDb().prepare('SELECT term, term_id, idf FROM chunk_vocab').all() as any[])
      .map((r) => [r.term as string, { id: Number(r.term_id), idf: Number(r.idf) }]));
  }
  if (!normCache) {
    normCache = new Map((demoDb().prepare('SELECT chunk_id, norm FROM chunk_vectors').all() as any[])
      .map((r) => [String(r.chunk_id), Number(r.norm)]));
  }

  const counts = new Map<number, { tf: number; idf: number }>();
  for (const tok of text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []) {
    const e = vocabCache.get(tok);
    if (!e) continue;
    const cur = counts.get(e.id);
    if (cur) cur.tf++; else counts.set(e.id, { tf: 1, idf: e.idf });
  }
  if (!counts.size) return out;

  const qw = new Map<number, number>();
  let qn = 0;
  for (const [id, { tf, idf }] of counts) {
    const w = (1 + Math.log(tf)) * idf;
    qw.set(id, w); qn += w * w;
  }
  qn = Math.sqrt(qn) || 1;

  const ids = [...qw.keys()];
  const ph = ids.map(() => '?').join(',');
  const postings = demoDb().prepare(
    `SELECT term_id, chunk_id, weight FROM chunk_inverted WHERE term_id IN (${ph})`).all(...ids) as any[];

  const dots = new Map<string, number>();
  for (const p of postings) {
    const w = qw.get(Number(p.term_id)) ?? 0;
    const id = String(p.chunk_id);
    dots.set(id, (dots.get(id) ?? 0) + w * Number(p.weight));
  }

  const scored = [...dots.entries()]
    .map(([id, dot]) => [id, dot / (qn * (normCache!.get(id) ?? 1))] as const)
    .sort((a, b) => b[1] - a[1]).slice(0, limit);
  const best = scored[0]?.[1] || 1;
  for (const [id, s] of scored) out.set(id, s / best);
  return out;
}

/**
 * A complex brief needs several ASPECTS of context, and a single query vector
 * pulls towards whichever aspect dominates the wording. Sub-queries are run per
 * aspect and unioned, so supplier and technical context are retrieved even
 * though those documents carry no customer link to boost them.
 */
const ASPECT_QUERIES: Partial<Record<Intent, string[]>> = {
  'enquiry-brief': [
    'supplier lead time weeks capacity confirmation delivery',
    'technical note applicability variant approval engineering',
    'account history previous quote outcome delivery friction',
    'process escalation delivery commitment supplier confirmation',
  ],
  'quote-prep': [
    'supplier lead time weeks capacity confirmation',
    'quotation checklist pricing review process',
    'technical review applicability engineering',
  ],
  'draft-response': [
    'customer response standards acknowledgement process',
    'supplier lead time weeks delivery position',
  ],
};

/** Reciprocal-rank-style fusion, then a metadata-aware rerank. */
export function retrieveKnowledge(question: string, topK = 12): KnowledgeResult {
  const t0 = Date.now();
  const intent = classifyIntent(question);
  const filters = extractFilters(question);
  const rewritten = rewriteQuery(question, intent, filters);
  const steps: KnowledgeResult['trace']['steps'] = [];

  steps.push({ label: 'Intent', detail: intentLabel(intent) });
  steps.push({
    label: 'Metadata filters',
    detail: describeFilters(filters) || 'None detected — searching the full corpus',
  });

  const keyword = keywordSearch(rewritten, 120);
  const vector = vectorSearch(rewritten, 120);
  steps.push({ label: 'Keyword retrieval', detail: `${keyword.size} chunks matched on exact terms` });
  steps.push({ label: 'Semantic retrieval', detail: `${vector.size} chunks matched on meaning` });

  // Aspect sub-queries, scored separately so they can surface context the main
  // query would otherwise crowd out.
  const aspectScores = new Map<string, number>();
  const aspects = ASPECT_QUERIES[intent] ?? [];
  for (const a of aspects) {
    const ak = keywordSearch(a, 40);
    const av = vectorSearch(a, 40);
    for (const [id, s] of ak) aspectScores.set(id, Math.max(aspectScores.get(id) ?? 0, s * 0.9));
    for (const [id, s] of av) aspectScores.set(id, Math.max(aspectScores.get(id) ?? 0, s * 0.9));
  }
  if (aspects.length) {
    steps.push({
      label: 'Aspect retrieval',
      detail: `${aspects.length} sub-queries surfaced ${aspectScores.size} additional chunks (supplier, technical, process)`,
    });
  }

  const ids = new Set([...keyword.keys(), ...vector.keys(), ...aspectScores.keys()]);
  if (!ids.size) {
    return {
      question, intent, rewrittenQuery: rewritten, filters, chunks: [], documents: [],
      trace: { keywordCandidates: 0, vectorCandidates: 0, filteredCandidates: 0, fused: 0, selected: 0, durationMs: Date.now() - t0, steps },
    };
  }

  const ph = [...ids].map(() => '?').join(',');
  const rows = demoDb().prepare(`
    SELECT c.chunk_id, c.document_id, c.text, d.*
    FROM document_chunks c JOIN documents d ON d.document_id = c.document_id
    WHERE c.chunk_id IN (${ph})
  `).all(...ids) as any[];

  let candidates: RetrievedChunk[] = rows.map((r) => {
    const k = keyword.get(r.chunk_id) ?? 0;
    const v = vector.get(r.chunk_id) ?? 0;
    const a = aspectScores.get(r.chunk_id) ?? 0;
    const matchedBy: string[] = [];
    if (k > 0) matchedBy.push('keyword');
    if (v > 0) matchedBy.push('semantic');
    if (a > 0) matchedBy.push('aspect');
    return {
      chunkId: r.chunk_id, documentId: r.document_id, text: r.text,
      document: r as DocumentRow,
      keywordScore: k, vectorScore: v,
      // Both signals contribute; agreement between them is rewarded.
      fusedScore: 0.55 * k + 0.45 * v + (k > 0 && v > 0 ? 0.1 : 0) + 0.5 * a,
      rerankScore: 0, matchedBy,
    };
  });

  // Metadata filtering is a boost rather than a hard cut, so a filter that is
  // slightly wrong cannot silently hide the answer.
  const filtered = candidates.filter((c) =>
    !filters.customerId || c.document.customer_id === filters.customerId);
  steps.push({
    label: 'Metadata filtering',
    detail: filters.customerId
      ? `${filtered.length} of ${candidates.length} chunks belong to the named customer`
      : 'No customer constraint applied',
  });

  candidates = candidates.map((c) => {
    let boost = 0;
    if (filters.customerId && c.document.customer_id === filters.customerId) boost += 0.35;
    if (filters.relatedRfqId && c.document.related_rfq_id === filters.relatedRfqId) boost += 0.25;
    if (filters.parts?.some((p) => (c.document.related_parts ?? '').toUpperCase().includes(p))) boost += 0.2;

    // Intent-aware document-type weighting.
    const typeBoost: Record<Intent, Record<string, number>> = {
      'enquiry-brief': { 'account-history': 0.3, quote: 0.25, rfq: 0.2, email: 0.15, 'supplier-correspondence': 0.2, 'technical-note': 0.15 },
      'find-similar': { rfq: 0.3, quote: 0.25, 'account-history': 0.2 },
      'quote-prep': { quote: 0.3, rfq: 0.2, 'supplier-correspondence': 0.25, process: 0.15 },
      'draft-response': { email: 0.3, 'account-history': 0.2, 'supplier-correspondence': 0.15 },
      'process-question': { process: 0.45 },
      general: {},
    };
    boost += typeBoost[intent][c.document.document_type] ?? 0;

    // Recency nudge — a year of age costs a little relevance.
    const ageDays = (Date.now() - Date.parse(c.document.updated_at)) / 86_400_000;
    const recency = Math.max(0, 0.15 * (1 - Math.min(ageDays, 900) / 900));

    return { ...c, rerankScore: c.fusedScore + boost + recency };
  });

  candidates.sort((a, b) => b.rerankScore - a.rerankScore);

  // Context selection: at most two chunks per document, so the context window
  // carries breadth across sources rather than one verbose document.
  const perDoc = new Map<string, number>();
  const selected: RetrievedChunk[] = [];
  for (const c of candidates) {
    const used = perDoc.get(c.documentId) ?? 0;
    if (used >= 2) continue;
    perDoc.set(c.documentId, used + 1);
    selected.push(c);
    if (selected.length >= topK) break;
  }

  // If one half of a conflicting pair made the cut, pull in its counterpart —
  // surfacing only one side of a disagreement would be worse than surfacing
  // neither, because it reads as settled fact.
  for (const c of [...selected]) {
    const target = c.document.conflicts_with;
    if (!target || selected.some((s) => s.documentId === target)) continue;
    const counterpart = candidates.find((x) => x.documentId === target);
    if (counterpart) {
      selected.push(counterpart);
      steps.push({
        label: 'Conflict detection',
        detail: `Retrieved a counterpart source that disagrees with ${c.document.title}`,
      });
    }
  }

  steps.push({ label: 'Reranking', detail: `${candidates.length} candidates ranked by relevance, recency and metadata` });
  steps.push({ label: 'Context selection', detail: `${selected.length} chunks from ${perDoc.size} documents` });

  const seen = new Set<string>();
  const documents = selected
    .map((c) => c.document)
    .filter((d) => !seen.has(d.document_id) && seen.add(d.document_id));

  return {
    question, intent, rewrittenQuery: rewritten, filters,
    chunks: selected, documents,
    trace: {
      keywordCandidates: keyword.size, vectorCandidates: vector.size,
      filteredCandidates: filtered.length, fused: candidates.length,
      selected: selected.length, durationMs: Date.now() - t0, steps,
    },
  };
}

function intentLabel(i: Intent): string {
  return {
    'enquiry-brief': 'Brief me on an incoming enquiry',
    'find-similar': 'Find previous or similar work',
    'quote-prep': 'Prepare a quotation',
    'draft-response': 'Draft a customer response',
    'process-question': 'Answer a process question',
    general: 'General knowledge question',
  }[i];
}

function describeFilters(f: KnowledgeFilters): string {
  const bits: string[] = [];
  if (f.customerId) {
    const c = demoDb().prepare('SELECT name FROM customers WHERE id = ?').get(f.customerId) as any;
    if (c) bits.push(`customer = ${c.name}`);
  }
  if (f.relatedRfqId) bits.push(`RFQ = ${f.relatedRfqId}`);
  if (f.parts?.length) bits.push(`parts = ${f.parts.join(', ')}`);
  return bits.join(' · ');
}
