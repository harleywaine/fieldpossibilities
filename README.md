# Field AI Opportunity Lab

**Explore what AI could do for Field.**
*From intelligent search to intelligent operations.*

An interactive demonstration of how AI could be implemented progressively across Field
International — four levels, each a working demo, each building on the last.

```
FIND  →  UNDERSTAND  →  DO  →  OPTIMISE
```

| Level | Capability | Data | Status |
|---|---|---|---|
| 1 · Customer Intelligence | AI **finds** — natural-language catalogue search | **Real** public Field catalogue (8,316 products) | Working |
| 2 · Knowledge Intelligence | AI **understands** — cross-document enquiry briefs | Synthetic internal corpus (173 documents) | Working |
| 3 · Workflow Automation | AI **does** — reads an RFQ, matches it, flags exceptions | Synthetic RFQ × real catalogue | Working |
| 4 · AI Operating Layer | AI **optimises** — opportunity analysis and ROI | Synthetic operational dataset | Working |

## Real vs synthetic — the line that matters

Only **Level 1 uses real data**: the public Field International catalogue, ingested and linked
back to every source page. Everything internal — customers, employees, RFQs, quotes, emails,
supplier correspondence, operational volumes — is **fabricated for demonstration** and labelled
as such wherever it appears. That distinction is enforced in the UI by a provenance badge on
every level and a notice on every synthetic page, not left to the reader to infer.

## Quick start

```bash
npm install
npm run scrape                # ingest the real catalogue (~35 min, resumable)
npm run generate-demo-data    # build the synthetic corpus (deterministic, instant)
npm run dev                   # http://localhost:3000
```

`catalogue.db` is committed, so a clone runs immediately without the crawl.

## The architectural point

> **The LLM is not the database.** AI is not the system of record.

The catalogue stays structured and authoritative. The AI layer supplies natural-language
understanding, retrieval, ranking, summarisation and explanation. Every factual claim in
the interface traces to a stored catalogue record, and every record links back to its
original public product page.

---

## Quick start

```bash
npm install
npm run scrape        # ingest the catalogue (~35 min for the full crawl)
npm run dev           # http://localhost:3000
```

The app reads only the persisted snapshot — it never scrapes at request time.
A search returns in well under a second.

### Without an API key

The AI layer defaults to a **deterministic grounded composer**: it assembles prose
strictly from fields already retrieved, so it cannot fabricate. No key, no network,
no per-query cost, and it works offline.

To use Claude for more fluent prose instead:

```bash
export ANTHROPIC_API_KEY=sk-...
export AI_PROVIDER=anthropic          # optional: ANTHROPIC_MODEL, default claude-haiku-4-5
```

Both paths receive identical grounded context and are bound by the same rules. If the
provider errors or rate-limits, it degrades to the deterministic path rather than failing.

---

## What the ingestion actually does

Field runs WordPress + WooCommerce and publicly exposes `wp/v2/product` and
`wc/store/v1/products`. Both are keyed on the same post id, so merging them yields a
complete core record for all **8,317 products in ~170 requests** rather than 8,317 page
fetches — considerably kinder to the origin and more reliable than parsing themed HTML.

The per-product HTML crawl still runs, for one reason the APIs cannot serve: Field's
product template renders a specification table containing **Lead Time (days)**, Weight,
Dimensions and Stock location. That table is why the crawler visits every product page.

```
robots.txt + sitemap index      →  URL discovery graph
wp/v2 + wc/store REST           →  core records, taxonomy, images
8,317 product pages             →  lead time, weight, dimensions
normalise → deduplicate         →  canonical records, alternate source URLs
SQLite + FTS5 + vector index    →  structured, lexical and semantic retrieval
dated snapshot + crawl report   →  provenance and validation
```

### Commands

| Command | Purpose |
|---|---|
| `npm run scrape` | Full ingestion. Resumes from checkpoint if interrupted. |
| `npm run scrape:incremental` | Revisit known URLs, detect changed content. |
| `npm run scrape:api` | REST records only; reuse cached pages. |
| `npm run rebuild-index` | Rebuild DB + indexes from stored raw payloads. No network. |
| `npm run validate` | Coverage and data-quality report. Non-zero exit if products are lost. |
| `npm run report` | Compact ingestion status. |
| `npm run cache-images` | Download catalogue imagery locally for demo resilience. |
| `npm run try "<query>"` | Run a retrieval query from the terminal. |

Politeness and resumption are configurable:

```bash
CRAWL_CONCURRENCY=5 CRAWL_DELAY_MS=180 npm run scrape
```

The crawler is robots-aware, rate-limited, retries with exponential backoff and
checkpoints every URL in `crawl_records`. Killing it mid-run loses almost nothing.

---

## How retrieval works

```
query → requirement extraction → structured constraints + semantic search
      → candidate set → ranking → grounded explanation → evidence
```

**Requirement extraction is deliberately not an LLM call.** The catalogue's vocabulary is
closed — 27 aircraft models, 6 manufacturers, ~57 ATA maintenance categories, a known set
of engine programmes. Entity resolution against that vocabulary is more reliable than
open-ended parsing, instant, and free.

Three retrieval strategies are fused:

- **Structured** — SQL over catalogue fields. Answers structured facts.
- **Lexical** — FTS5 with BM25 over the product document.
- **Semantic** — cosine similarity over a TF-IDF vector index built from the catalogue
  itself, reached through an inverted index. Pluggable: `EmbeddingProvider` accepts a
  hosted embedding model without touching retrieval.

Ranking uses explicit, configurable weights (`lib/ai/ranking.ts`), re-normalised across
the dimensions a given requirement actually constrains — a query that names no engine is
not penalised on the engine axis.

---

## Data honesty

This is the part that matters most in a technically sensitive domain, and it is enforced
in code rather than left to prompt wording.

**Absent fields stay `null`.** They are never inferred, and the UI prints
"Not published in catalogue" rather than leaving a blank that reads as absence of a problem.

**Model-level applicability is never promoted to variant level.** The catalogue records
`BOEING 787`. A request for a 787-9 resolves to `BOEING 787` and the requirement's variant
is retained separately, so every affected result carries:

> Catalogue lists applicability as BOEING 787. It does not state whether this covers the
> 787-9 variant specifically.

**Engine is only ever read from source text.** If a listing does not name an engine, the
product cannot be classified as a strong match for an engine-specific requirement — a
high blended score is not sufficient.

**Lead time is reported, never promised.** "The catalogue lists a lead time of 75 days",
not "this will arrive in time". Where a lead time is unpublished the interface says so.

**Equivalence questions are refused.** Asked whether one tool can replace another, the
system states that the catalogue records no interchangeability or certification data and
that the question cannot be answered from it.

**No confidence percentages.** Scores translate to *Strong match / Potential match /
Alternative / No confirmed match*.

**Source inconsistencies are surfaced, not resolved.** Some listings carry one part number
in the SKU and a different one in the title. Both are shown, flagged, and left to Field.

---

## Project layout

```
ingestion/     crawler, discovery, parser, normalise, deduplicate, validate,
               storage, writer, embeddings, images, snapshot, logger
lib/
  ai/          requirement, retrieval, ranking, provider, prompts, explain
  search/      structured, lexical, semantic
  catalogue/   types, lexicon, browse
  db/          client
app/           landing, search, catalogue, product, compare, requests,
               architecture, ingestion, api routes
scripts/       scrape, rebuild-index, validate, snapshot, report, cache-images
data/
  raw/         gzipped source HTML + raw API payloads (source evidence)
  catalogue/   products.json, products.csv, catalogue.db, metadata.json
  snapshots/   dated immutable snapshots
```

`data/raw/` and `public/catalogue-images/` are gitignored — regenerate with
`npm run scrape` and `npm run cache-images`.

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page and AI search entry |
| `/search?q=` | Requirement understanding, retrieval trace, evidenced results |
| `/catalogue` | Conventional faceted browse — the deliberate contrast |
| `/product/[id]` | Full record, evidence, and link to the original Field page |
| `/compare?ids=` | Comparison table built from available fields only |
| `/requests` | Demo RFQ records (local; never transmitted to Field) |
| `/architecture` | Pipeline view and live index figures |
| `/ingestion` | Crawl report, field population, data honesty notes |

---

## Prototype boundaries

- Catalogue data is a snapshot of publicly available Field International listings.
- Customer and quote data is **synthetic**. RFQs are written to a local JSON file and are
  **never transmitted to Field International** — there is no commercial backend integration.
- This prototype makes no certification, approval or airworthiness claims, and is not a
  substitute for the applicable maintenance manual.


---

## Levels 2–4: how they work

### Level 2 — Knowledge Intelligence

A hybrid RAG pipeline over 173 synthetic internal documents (~176 chunks):

```
question → intent → query rewriting → metadata filters
        → keyword (BM25) + vector (cosine) + aspect sub-queries
        → fusion → rerank → context selection → cited brief
```

Aspect sub-queries matter: a single query vector pulls towards whichever aspect of a question
dominates the wording, so supplier and technical context — which carry no customer link to boost
them — would otherwise never surface. The brief that results is assembled across a dozen
documents, and every field carries its sources.

The corpus is deliberately awkward. It contains a **lead-time conflict** (an internal note saying
12 weeks, superseded by a supplier email saying 8–10), a **stale document** flagged by age, an
**engineering caveat** that blocks any variant-level approval claim, and a **part number with no
catalogue equivalent**. The system surfaces all four rather than resolving them silently — and if
one half of a conflicting pair is retrieved, the counterpart is pulled in deliberately, because
showing one side of a disagreement reads as settled fact.

### Level 3 — Workflow Automation

A 17-line RFQ is read, extracted, and matched **against the real catalogue**. The outcome is
computed, not scripted: **14 matched, 2 requiring review, 1 with no confirmed match.**

The exception path is the point. A requested part number that does not resolve is reported as
*no confirmed match* — a loose description match is not evidence that a different item is
equivalent. An engine mismatch is always a human call. Four approval gates are explicit: no
pricing, no delivery date, no statement of technical suitability, and nothing sent externally.

### Level 4 — AI Operating Layer and ROI

Every figure is computed from stated assumptions; changing an input moves the whole model. The
ROI calculator exposes the distinction a board will ask about:

> Recovering 3,159 employee hours does not mean payroll falls by £199,002. Productivity value is
> recovered **capacity**. The cash-equivalent view applies an explicit conversion assumption.

Hours are the primary unit; money is derived from hours, never the reverse. Payback is calculated
against the cash figure, not the headline.

## Commands

| Command | Purpose |
|---|---|
| `npm run scrape` | Ingest the real catalogue. Resumable. |
| `npm run generate-demo-data` | Rebuild the synthetic corpus from a fixed seed. |
| `npm run try "<query>"` | Level 1 retrieval from the terminal. |
| `npm run try:knowledge` | Level 2 enquiry brief from the terminal. |
| `npm run try:workflow` | Level 3 RFQ processing from the terminal. |
| `npm run try:roi` | Level 4 opportunity model from the terminal. |
| `npm run validate` / `npm run report` | Ingestion coverage and status. |

## Deployment note

Everything persists in SQLite with FTS5 and a locally-built vector index, so the demo runs with
no external services and no network dependency. The schema and retrieval design map onto
PostgreSQL with pgvector, which is the expected production target; retrieval interfaces are
storage-agnostic and the embedding provider is pluggable.

## Non-goals

No production ERP or CRM integration, no real employee accounts, no real customer communication,
no purchasing, no technical approvals, no autonomous commercial or engineering decisions. This
demonstrates the architecture and the opportunity, not a deployed system.
