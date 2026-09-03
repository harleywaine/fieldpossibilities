/**
 * Normalisation: merges the two API views plus the crawled product page into a
 * single canonical record.
 *
 * Governing rule (brief §8, §20): a field is populated only when the source
 * establishes it. Everything else is null. Derived fields are recorded together
 * with the source text they were derived from, so the UI can cite evidence.
 */
import { createHash } from 'node:crypto';
import type { WpProduct, StoreProduct } from './catalogue.ts';
import type { TaxonomyTerm } from './discovery.ts';
import { decodeEntities } from './discovery.ts';
import {
  parseSpecTable, parseDescriptionFacts, parseDimensions, parseLeadTimeDays,
  parseWeight, cell, htmlToText, type SpecTable,
} from './parser.ts';
import { primaryEngine, matchConcepts, APPLICATIONS } from '../lib/catalogue/lexicon.ts';

export type Provenance = 'catalogue-record' | 'product-description' | 'product-title' | 'product-page';

export interface FieldEvidence {
  value: string | number;
  source: Provenance;
  quote?: string;
}

export interface NormalisedProduct {
  id: string;
  wp_id: number;
  part_number: string | null;
  /** Leading part-number token in the title, when it disagrees with the SKU. */
  part_number_in_title: string | null;
  name: string;
  title: string;
  description: string | null;
  description_html: string | null;
  short_description: string | null;
  manufacturer: string | null;
  aircraft_manufacturer: string | null;
  aircraft_family: string | null;
  aircraft_model: string | null;
  aircraft_variant: string | null;
  engine: string | null;
  application: string | null;
  maintenance_category: string | null;
  product_category: string | null;
  equipment_type: string | null;
  weight: string | null;
  dimensions: string | null;
  material: string | null;
  condition: string | null;
  availability: string | null;
  lead_time_days: number | null;
  stock_status: string | null;
  stock_location: string | null;
  ce_marked: boolean | null;
  request_quote_url: string | null;
  product_url: string;
  canonical_url: string;
  source_url: string;
  source_domain: string;
  content_hash: string;
  html_hash: string | null;
  scraped_at: string;
  modified_at: string | null;
  detail_crawled: boolean;
  aircraft_models: string[];
  applications: string[];
  images: Array<{ src: string; thumbnail: string | null; alt: string | null; isPlaceholder: boolean }>;
  terms: Array<{ taxonomy: string; term_id: number }>;
  evidence: Record<string, FieldEvidence>;
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

const clean = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const t = decodeEntities(String(s)).replace(/\s+/g, ' ').trim();
  return t.length ? t : null;
};

/** Titles follow `<PART> <EQUIPMENT TYPE> – <APPLICATION>[, ENGINE] [(CE)]`. */
export function splitTitle(title: string, partNumber: string | null) {
  let body = title.trim();
  if (partNumber && body.toUpperCase().startsWith(partNumber.toUpperCase())) {
    body = body.slice(partNumber.length).trim();
  } else {
    body = body.replace(/^\s*[A-Z0-9][A-Z0-9\-/.]{2,}\s+(?=[A-Z])/, '');
  }

  const ceMarked = /\(\s*CE\s*\)/i.test(body);
  body = body.replace(/\(\s*CE\s*\)/gi, '').trim();

  const parts = body.split(/\s+[–—]\s+|\s+-\s+/);
  const equipmentType = parts.length > 1 ? clean(parts[0]) : clean(body);
  const applicationRaw = parts.length > 1 ? clean(parts.slice(1).join(' – ')) : null;

  return { equipmentType, applicationRaw, ceMarked };
}

export interface NormaliseInput {
  wp: WpProduct;
  store?: StoreProduct;
  html?: string | null;
  termIndex: Map<string, TaxonomyTerm>;
  sourceDomain: string;
  firstSeenIso?: string;
}

export function normaliseProduct(input: NormaliseInput): NormalisedProduct {
  const { wp, store, html, termIndex, sourceDomain } = input;
  const evidence: Record<string, FieldEvidence> = {};

  const title = clean(wp.title?.rendered) ?? clean(store?.name) ?? `Product ${wp.id}`;
  const descHtml = wp.content?.rendered ?? store?.description ?? null;
  const descText = descHtml ? htmlToText(descHtml) : null;
  const shortDesc = clean(store?.short_description ? htmlToText(store.short_description) : null);

  // ---- Spec table from the crawled page (the only source of lead time) ----
  const spec: SpecTable = html ? parseSpecTable(html) : {};
  const hasSpec = Object.keys(spec).length > 0;

  // ---- Part number: SKU is authoritative; the table confirms it ----
  const partNumber =
    clean(store?.sku) ?? cell(spec, 'Part Number') ?? null;
  if (partNumber) {
    evidence.part_number = {
      value: partNumber,
      source: store?.sku ? 'catalogue-record' : 'product-page',
    };
  }

  // Some listings carry a different part number in the title than in the SKU.
  // Both are reported rather than silently resolved — the source disagrees with
  // itself and only Field can say which is correct.
  const titleToken = clean(title.match(/^\s*([A-Z0-9][A-Z0-9\-/.]{3,})\s/)?.[1] ?? null);
  const partNumberInTitle =
    titleToken && partNumber && titleToken.toUpperCase() !== partNumber.toUpperCase()
      ? titleToken
      : null;

  // ---- Taxonomy-derived facts ----
  const termsOf = (tax: string): TaxonomyTerm[] =>
    ((wp as any)[tax] as number[] | undefined ?? [])
      .map((id) => termIndex.get(`${tax}:${id}`))
      .filter((t): t is TaxonomyTerm => Boolean(t));

  const catTerms = termsOf('product_cat');
  const modelTerms = termsOf('aircraft-model');
  const conditionTerms = termsOf('condition');
  const stockTerms = termsOf('stock-location');
  const tagTerms = termsOf('product_tag');

  const manufacturer = clean(catTerms[0]?.name) ?? cell(spec, 'Aircraft Manufacturer');
  if (manufacturer) {
    evidence.manufacturer = {
      value: manufacturer,
      source: catTerms.length ? 'catalogue-record' : 'product-page',
    };
  }

  // Aircraft models come from the taxonomy verbatim. No variant is ever inferred:
  // the catalogue says "BOEING 787", never "787-9" (brief §20).
  const aircraftModels = modelTerms.map((t) => t.name).filter(Boolean);
  const aircraftModel = aircraftModels.length ? aircraftModels.join(', ') : cell(spec, 'Aircraft Models');
  if (aircraftModel) {
    evidence.aircraft_model = {
      value: aircraftModel,
      source: modelTerms.length ? 'catalogue-record' : 'product-page',
    };
  }

  const aircraftFamily = aircraftModels.length === 1 ? aircraftModels[0] : null;

  // ---- Facts embedded in Field's own description text ----
  const facts = descText ? parseDescriptionFacts(descText) : { aircraftApplication: null, maintenanceCategory: null };
  const maintenanceCategory = clean(facts.maintenanceCategory);
  if (maintenanceCategory) {
    evidence.maintenance_category = {
      value: maintenanceCategory,
      source: 'product-description',
      quote: `MAINTENACE CATEGORY: ${maintenanceCategory}`,
    };
  }

  // ---- Title decomposition ----
  const { equipmentType, applicationRaw, ceMarked } = splitTitle(title, partNumber);
  const application = applicationRaw ?? clean(facts.aircraftApplication);
  if (application) {
    evidence.application = {
      value: application,
      source: applicationRaw ? 'product-title' : 'product-description',
      quote: title,
    };
  }

  // ---- Engine: recognised only where the source text names it ----
  const haystack = `${title}\n${descText ?? ''}`;
  const engine = primaryEngine(haystack);
  if (engine) {
    const line = haystack.split('\n').find((l) => new RegExp(engine.replace(/[^\w]/g, '.?'), 'i').test(l));
    evidence.engine = { value: engine, source: 'product-title', quote: clean(line) ?? title };
  }

  // ---- Spec-table-only fields ----
  const leadTime = parseLeadTimeDays(cell(spec, 'Lead Time (days)', 'Lead Time') ?? undefined);
  if (leadTime !== null) {
    evidence.lead_time_days = { value: leadTime, source: 'product-page', quote: `Lead Time (days): ${leadTime}` };
  }

  const weight =
    parseWeight(cell(spec, 'Weight (kg)', 'Weight') ?? undefined) ??
    (store?.weight ? `${store.weight} kg` : null);
  if (weight) evidence.weight = { value: weight, source: hasSpec ? 'product-page' : 'catalogue-record' };

  const dims =
    parseDimensions(cell(spec, 'Dimensions (cm)', 'Dimensions') ?? undefined) ??
    dimsFromStore(store);
  if (dims) evidence.dimensions = { value: dims, source: hasSpec ? 'product-page' : 'catalogue-record' };

  const condition = clean(conditionTerms[0]?.name) ?? cell(spec, 'Condition');
  if (condition) evidence.condition = { value: condition, source: 'catalogue-record' };

  const stockLocation = clean(stockTerms[0]?.name) ?? cell(spec, 'Stock location', 'Stock Location');
  const stockStatus = clean(store?.stock_availability?.text);
  if (stockStatus) evidence.stock_status = { value: stockStatus, source: 'catalogue-record' };

  const productUrl = wp.link ?? store?.permalink ?? '';
  const images = (store?.images ?? []).map((im) => ({
    src: im.src,
    thumbnail: im.thumbnail ?? null,
    alt: clean(im.alt) ?? clean(im.name),
    isPlaceholder: /Field_Placeholder/i.test(im.src),
  }));

  const applications = matchConcepts(haystack, APPLICATIONS);

  const contentHash = sha256(
    JSON.stringify([title, descText, partNumber, aircraftModel, manufacturer, leadTime, weight, dims]),
  );

  const terms = [
    ...catTerms.map((t) => ({ taxonomy: 'product_cat', term_id: t.id })),
    ...modelTerms.map((t) => ({ taxonomy: 'aircraft-model', term_id: t.id })),
    ...conditionTerms.map((t) => ({ taxonomy: 'condition', term_id: t.id })),
    ...stockTerms.map((t) => ({ taxonomy: 'stock-location', term_id: t.id })),
    ...tagTerms.map((t) => ({ taxonomy: 'product_tag', term_id: t.id })),
  ];

  return {
    id: String(wp.id),
    wp_id: wp.id,
    part_number: partNumber,
    part_number_in_title: partNumberInTitle,
    name: title,
    title,
    description: descText,
    description_html: descHtml,
    short_description: shortDesc,
    manufacturer,
    aircraft_manufacturer: manufacturer,
    aircraft_family: aircraftFamily,
    aircraft_model: aircraftModel,
    aircraft_variant: null, // never inferred — the catalogue does not publish variants
    engine,
    application,
    maintenance_category: maintenanceCategory,
    product_category: clean(catTerms.map((t) => t.name).join(', ')),
    equipment_type: equipmentType,
    weight,
    dimensions: dims,
    material: null, // not published by the source
    condition,
    availability: stockStatus,
    lead_time_days: leadTime,
    stock_status: stockStatus,
    stock_location: stockLocation,
    ce_marked: ceMarked ? true : null,
    request_quote_url: productUrl || null,
    product_url: productUrl,
    canonical_url: productUrl,
    source_url: productUrl,
    source_domain: sourceDomain,
    content_hash: contentHash,
    html_hash: html ? sha256(html) : null,
    scraped_at: new Date().toISOString(),
    modified_at: wp.modified_gmt ? `${wp.modified_gmt}Z` : null,
    detail_crawled: Boolean(html),
    aircraft_models: aircraftModels,
    applications,
    images,
    terms,
    evidence,
  };
}

function dimsFromStore(store?: StoreProduct): string | null {
  const d = store?.dimensions;
  if (!d) return null;
  const parts = (['length', 'width', 'height'] as const)
    .map((k, i) => {
      const v = (d[k] ?? '').trim();
      return v ? `${['L', 'W', 'H'][i]}: ${v}` : null;
    })
    .filter(Boolean);
  return parts.length ? `${parts.join(' × ')} cm` : null;
}

/**
 * Builds the text document that the semantic index embeds (brief §17).
 * Only fields the source actually populated are included.
 */
export function searchDocument(p: NormalisedProduct): string {
  const lines: string[] = [];
  const add = (label: string, v: string | number | null) => {
    if (v !== null && v !== undefined && String(v).trim()) lines.push(`${label}: ${v}`);
  };
  add('Part Number', p.part_number);
  add('Product', p.name);
  add('Equipment Type', p.equipment_type);
  add('Manufacturer', p.manufacturer);
  add('Aircraft', p.aircraft_model);
  add('Application', p.application);
  add('Engine', p.engine);
  add('Maintenance Category', p.maintenance_category);
  add('Concepts', p.applications.join(', '));
  add('Description', p.description);
  return lines.join('\n');
}
