/**
 * Deduplication (brief §11).
 *
 * The same product is reachable via manufacturer, aircraft-model, category, tag
 * and pagination routes. Canonical identity is resolved in the brief's stated
 * priority order, and every alternate route is retained as an alternate source.
 */
import type { NormalisedProduct } from './normalise.ts';

export interface DedupeResult {
  products: NormalisedProduct[];
  duplicatesRemoved: number;
  alternates: Map<string, Set<string>>;
  collisions: Array<{ keptId: string; droppedId: string; reason: string }>;
}

const norm = (s: string | null) => (s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

export function deduplicate(input: NormalisedProduct[]): DedupeResult {
  const byUrl = new Map<string, NormalisedProduct>();
  const byPart = new Map<string, NormalisedProduct>();
  const byWpId = new Map<number, NormalisedProduct>();
  const byTitleMfr = new Map<string, NormalisedProduct>();

  const alternates = new Map<string, Set<string>>();
  const collisions: DedupeResult['collisions'] = [];
  const kept: NormalisedProduct[] = [];

  const addAlt = (id: string, url: string) => {
    if (!alternates.has(id)) alternates.set(id, new Set());
    alternates.get(id)!.add(url);
  };

  /** Prefer the record carrying more established facts. */
  const richness = (p: NormalisedProduct) =>
    [p.lead_time_days, p.weight, p.dimensions, p.part_number, p.engine, p.maintenance_category]
      .filter((v) => v !== null && v !== undefined).length + (p.detail_crawled ? 1 : 0);

  for (const p of input) {
    // 1. Product URL  2. WordPress id  3. Part number  4. Title + manufacturer
    const urlKey = norm(p.canonical_url);
    const partKey = p.part_number ? norm(p.part_number) : null;
    const titleKey = `${norm(p.title)}|${norm(p.manufacturer)}`;

    const existing =
      byUrl.get(urlKey) ??
      byWpId.get(p.wp_id) ??
      (partKey ? byPart.get(partKey) : undefined) ??
      byTitleMfr.get(titleKey);

    if (existing) {
      const reason = byUrl.has(urlKey)
        ? 'same canonical url'
        : byWpId.has(p.wp_id)
          ? 'same product id'
          : partKey && byPart.has(partKey)
            ? 'same part number'
            : 'same title + manufacturer';

      if (richness(p) > richness(existing)) {
        // Replace the weaker record but keep its URL as an alternate route.
        const idx = kept.indexOf(existing);
        if (idx >= 0) kept[idx] = p;
        addAlt(p.id, existing.canonical_url);
        for (const u of alternates.get(existing.id) ?? []) addAlt(p.id, u);
        byUrl.set(urlKey, p);
        byWpId.set(p.wp_id, p);
        if (partKey) byPart.set(partKey, p);
        byTitleMfr.set(titleKey, p);
        collisions.push({ keptId: p.id, droppedId: existing.id, reason });
      } else {
        addAlt(existing.id, p.canonical_url);
        collisions.push({ keptId: existing.id, droppedId: p.id, reason });
      }
      continue;
    }

    kept.push(p);
    byUrl.set(urlKey, p);
    byWpId.set(p.wp_id, p);
    if (partKey) byPart.set(partKey, p);
    byTitleMfr.set(titleKey, p);
    addAlt(p.id, p.canonical_url);
  }

  return {
    products: kept,
    duplicatesRemoved: input.length - kept.length,
    alternates,
    collisions,
  };
}
