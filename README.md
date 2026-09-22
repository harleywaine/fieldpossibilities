# Field AI Opportunity Lab

**One enquiry, followed from the customer's request to the factory — built on Field
International's own published catalogue.**

The site is a single interactive journey. It opens on a full-screen cover, then sets out the
nine ways AI could be used at Field, each tied to the step where it appears, and states what's
known (the public catalogue) and what's assumed (everything inside Field). Every screen the
visitor operates is a mock-up window, so it reads as a picture of a system.

- **The customer's side**, a mock of Field's website. The visitor describes the job, and the
  system finds the parts in Field's real catalogue, with the reason for each part and how the
  search worked. They untick anything they don't need, request a quote with an email and
  company, and send it.
- **Field's side**, a mock CRM. The enquiry lands already logged, matched to an account and
  assigned. The account screen shows value, win rate, recent jobs, complaints, activity and a
  brief assembled from internal documents. Then come the line check, Engineering, Procurement,
  pricing, quote sign-off and the order. At each decision the visitor is signed in as the person
  who would make it, and the journey stops until they decide.

A company name matching one of the eight synthetic accounts brings up that account's history;
any other name becomes a new lead. The email and company stay in the browser tab. Every step has
its own URL (`?s=0`–`?s=12`), the progress bar won't skip an undecided step, and a time bar adds
up people's time, today versus with AI.

Retired addresses from earlier versions (`/demos`, `/explore`, `/search`, …) redirect to the
journey rather than 404.

## What's real, synthetic and simulated

- **Real:** Field's published catalogue — every part, photo, specification and lead time shown.
- **Synthetic:** customers and their history, complaints, Field's staff, suppliers, and every
  price, cost and margin. Field publishes no prices, so the pricing step invents them, seeded per
  part number (`lib/simulation/pricing.ts`), and every screen showing one carries a striped
  SYNTHETIC banner or tag; the quote carries a watermark.
- **Simulated:** supplier replies and the order in production.

The **time figures are assumptions**, not measurements. The "How is this estimated?" button on
the time bar, and the end of the journey, say so, explain what each figure covers, why it would
change with Field's current process, and how to measure the real ones.

## Access

The whole site sits behind one shared password (`proxy.ts`, `lib/access.ts`): an unlock screen
sets a signed cookie that lasts 30 days, and the APIs answer 401 without it. The repository is
public, so only a hash of the default password is in the source. Set `DEMO_PASSWORD` to change it
and `DEMO_SECRET` to sign sessions with a key that isn't in the repo. It keeps the link private;
it isn't user authentication.

## Quick start

```bash
npm install
npm run dev                   # http://localhost:3000
```

Both databases are committed, so a clone runs immediately. To rebuild them:

```bash
npm run scrape                # ingest the real catalogue (~35 min, resumable)
npm run generate-demo-data    # rebuild the synthetic data (deterministic, instant)
```

## The architectural point

> **The LLM is not the database.** AI is not the system of record.

The catalogue stays structured and authoritative. The AI layer supplies natural-language
understanding, retrieval, ranking and explanation. Every factual claim traces to a stored
catalogue record, and every record links back to its public product page.

The AI layer defaults to a **deterministic grounded composer** that assembles prose strictly from
retrieved fields, so it cannot fabricate: no key, no network, no per-query cost. To use Claude for
the account brief instead, set `ANTHROPIC_API_KEY` and `AI_PROVIDER=anthropic` (optionally
`ANTHROPIC_MODEL`, default `claude-haiku-4-5`). If the provider fails, it falls back to the
deterministic path.

## What the ingestion does

Field runs WordPress + WooCommerce and publicly exposes `wp/v2/product` and
`wc/store/v1/products`. Both are keyed on the same post id, so merging them yields a complete core
record for every product in ~170 requests rather than one fetch per product. The per-product page
crawl still runs for the one thing the APIs don't serve: the specification table with lead time,
weight, dimensions and stock location.

```
robots.txt + sitemap index      →  URL discovery
wp/v2 + wc/store REST           →  core records, taxonomy, images
product pages                   →  lead time, weight, dimensions
normalise → deduplicate         →  canonical records
SQLite + FTS5 + vector index    →  structured, lexical and semantic retrieval
dated snapshot + crawl report   →  provenance and validation
```

The crawler is robots-aware, rate-limited, retries with backoff and checkpoints every URL, so an
interrupted run resumes. `CRAWL_CONCURRENCY` and `CRAWL_DELAY_MS` tune its politeness.

## How the parts search works

```
request → requirement extraction → structured + lexical + semantic retrieval
        → ranking → evidence per match → engineering and supplier checks
```

**Requirement extraction is deliberately not an LLM call.** The catalogue's vocabulary is closed —
aircraft models, manufacturers, ATA maintenance categories, engine programmes — so resolving
against it is more reliable than open-ended parsing, instant and free. Structured SQL, FTS5/BM25
and a TF-IDF vector index built from the catalogue are fused, and ranked with explicit weights
(`lib/ai/ranking.ts`) re-normalised across what the request actually constrains.

## Data honesty

Enforced in code, not left to wording:

- **Absent fields stay empty** and are shown as not published, never inferred.
- **Model-level fit is never promoted to variant level.** A request for a 787-9 matches records
  listed for the 787, and the gap becomes an Engineering question: "Does it fit the Boeing 787-9?"
- **An engine is only read from source text.** A record that names no engine can't be a strong
  match for an engine-specific request.
- **Lead time is reported, never promised.** Where it's unpublished, Procurement is asked.
- **No confidence percentages** — Direct match, Likely match, Alternative.

## Project layout

```
app/           the journey (/), unlock screen, and three APIs:
               simulate/rfq (parts search), knowledge (account brief), unlock
components/
  journey/     Journey (controller), shell (cover, bar, dock, results),
               frames (browser + CRM windows), customer-stages, crm-stages, ui
lib/
  simulation/  rfq (parts → quote request), crm (accounts, inbox), pricing (synthetic)
  ai/ search/  requirement extraction, retrieval, ranking
  knowledge/   the account brief
  db/          read-only access to both databases
  journey.ts   steps, people, AI uses, time-estimate notes
ingestion/     crawler, parser, normalise, deduplicate, validate, storage, indexes
scripts/       scrape, rebuild-index, generate-demo-data, validate, report, try-*
data/
  catalogue/   catalogue.db (committed), metadata.json
  demo/        demo.db (committed), dataset.json
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run locally. |
| `npm run scrape` | Ingest the real catalogue. Resumable. |
| `npm run rebuild-index` | Rebuild the catalogue and indexes from stored raw payloads. No network. |
| `npm run generate-demo-data` | Rebuild the synthetic data from a fixed seed. |
| `npm run try "<query>"` | Parts retrieval from the terminal. |
| `npm run try:sim "<request>"` | The journey's parts search and CRM accounts from the terminal. |
| `npm run try:knowledge` | The account brief from the terminal. |
| `npm run validate` / `npm run report` | Ingestion coverage and status. |

## Deployment

Hosted on Vercel from `main`. Two things matter on a serverless host, whose code folder is
read-only:

- **The databases ship in rollback journal mode.** A WAL-mode SQLite file can't be opened on a
  read-only filesystem, so every script that writes one seals it before closing
  (`sealForReadOnly` in `ingestion/storage.ts`), and `next.config.mjs` names the files so every
  function bundles them.
- **The little the app writes** (an audit trail of briefs) goes to the temporary directory when
  `data/` isn't writable (`lib/writable.ts`).

## Non-goals

No ERP or CRM integration, no real accounts, no real customer communication, no purchasing, no
technical approvals, no autonomous commercial or engineering decisions. This demonstrates the
opportunity, not a deployed system.
