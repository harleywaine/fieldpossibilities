/** Central crawl configuration. Every knob the brief asks for lives here. */
export const CONFIG = {
  origin: 'https://www.fieldinternational.com',
  sourceName: 'Field International public catalogue',
  sourceDomain: 'www.fieldinternational.com',

  /** Identifies the crawler honestly, per brief §6. */
  userAgent:
    'FieldToolingIntelligenceBot/0.1 (+prototype; catalogue ingestion for evaluation demo)',

  /** Politeness controls. */
  concurrency: Number(process.env.CRAWL_CONCURRENCY ?? 4),
  delayMs: Number(process.env.CRAWL_DELAY_MS ?? 150),
  timeoutMs: Number(process.env.CRAWL_TIMEOUT_MS ?? 45_000),
  maxAttempts: Number(process.env.CRAWL_MAX_ATTEMPTS ?? 4),
  backoffBaseMs: 800,
  backoffMaxMs: 30_000,

  /** REST surfaces discovered during reconnaissance. */
  api: {
    wp: '/wp-json/wp/v2',
    store: '/wp-json/wc/store/v1',
    perPage: 100,
  },

  /** Product taxonomies exposed by the site (discovered, not assumed). */
  taxonomies: [
    'product_cat',
    'product_tag',
    'product_brand',
    'aircraft-model',
    'condition',
    'stock-location',
  ] as const,

  paths: {
    data: 'data',
    rawApi: 'data/raw/api',
    rawProducts: 'data/raw/products',
    images: 'public/catalogue-images',
    processed: 'data/processed',
    snapshots: 'data/snapshots',
    catalogue: 'data/catalogue',
    db: process.env.CATALOGUE_DB ?? 'data/catalogue/catalogue.db',
    crawlState: 'data/crawl_state.json',
  },

  /** Cap raw HTML retained per product (pages are ~190KB, mostly theme chrome). */
  keepRawHtml: process.env.CRAWL_KEEP_RAW !== '0',
} as const;

export type Config = typeof CONFIG;
