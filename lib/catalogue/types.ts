/** Shared catalogue types. Mirrors the ingested schema. */

export type Provenance =
  | 'catalogue-record' | 'product-description' | 'product-title' | 'product-page';

export interface ProductImage {
  src: string;
  thumbnail: string | null;
  alt: string | null;
  isPlaceholder: boolean;
  /** Locally cached copy, when the image has been downloaded (brief §40). */
  localPath: string | null;
}

export interface Product {
  id: string;
  partNumber: string | null;
  /** Present only when the listing's title disagrees with its SKU. */
  partNumberInTitle: string | null;
  name: string;
  description: string | null;
  shortDescription: string | null;
  manufacturer: string | null;
  aircraftModel: string | null;
  aircraftModels: string[];
  aircraftVariant: string | null;
  engine: string | null;
  application: string | null;
  maintenanceCategory: string | null;
  equipmentType: string | null;
  weight: string | null;
  dimensions: string | null;
  material: string | null;
  condition: string | null;
  availability: string | null;
  leadTimeDays: number | null;
  stockStatus: string | null;
  stockLocation: string | null;
  ceMarked: boolean | null;
  productUrl: string;
  sourceUrl: string;
  sourceDomain: string;
  scrapedAt: string;
  detailCrawled: boolean;
  images: ProductImage[];
}

/** A single citable fact behind a match (brief §22). */
export interface EvidenceItem {
  label: string;
  value: string;
  source: Provenance;
  quote?: string;
}

export type MatchClass = 'strong' | 'potential' | 'alternative' | 'none';

export interface ScoredProduct {
  product: Product;
  score: number;
  matchClass: MatchClass;
  evidence: EvidenceItem[];
  /** Requirement elements the catalogue does not establish for this product. */
  gaps: string[];
  breakdown: Record<string, number>;
}

export interface CatalogueMeta {
  source: string;
  source_domain: string;
  crawl_started: string;
  crawl_completed: string | null;
  crawl_mode: string;
  product_count: number;
  source_pages: number;
  failed_pages: number;
  duplicates_removed: number;
  detail_coverage_pct: number;
  taxonomy_terms: number;
  snapshot_date: string;
  notes: string[];
}

export interface TaxonomyTermRow {
  taxonomy: string;
  term_id: number;
  name: string;
  slug: string;
  count: number;
  parent: number | null;
}
