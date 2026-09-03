/**
 * Product image caching (brief §40).
 *
 * Images are optional for correctness but valuable for demo resilience: a local
 * copy means the interface renders with no network access. Remote URLs are
 * always retained, and a failed download is never fatal — the UI falls back to
 * the remote URL, then to a neutral placeholder.
 */
import { writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { CONFIG } from './config.ts';
import { politeFetchBinary, mapPool } from './http.ts';
import { makeLogger } from './logger.ts';

const log = makeLogger('images');

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function localName(src: string): string | null {
  let ext = extname(new URL(src).pathname).toLowerCase();
  if (!ALLOWED.has(ext)) ext = '.jpg';
  const hash = createHash('sha1').update(src).digest('hex').slice(0, 20);
  return `${hash}${ext}`;
}

export interface ImageCacheStats {
  considered: number;
  downloaded: number;
  cached: number;
  failed: number;
  bytes: number;
}

export async function cacheImages(
  db: DatabaseSync,
  opts: { includePlaceholders?: boolean; limit?: number } = {},
): Promise<ImageCacheStats> {
  mkdirSync(CONFIG.paths.images, { recursive: true });

  const rows = db.prepare(`
    SELECT product_id, position, COALESCE(thumbnail, src) AS url
    FROM product_images
    ${opts.includePlaceholders ? '' : 'WHERE is_placeholder = 0'}
    ORDER BY product_id, position
  `).all() as any[];

  const targets = opts.limit ? rows.slice(0, opts.limit) : rows;
  const stats: ImageCacheStats = {
    considered: targets.length, downloaded: 0, cached: 0, failed: 0, bytes: 0,
  };

  const update = db.prepare(
    'UPDATE product_images SET local_path = ? WHERE product_id = ? AND position = ?');

  await mapPool(targets, async (row) => {
    let name: string | null;
    try {
      name = localName(row.url);
    } catch {
      stats.failed++;
      return;
    }
    if (!name) { stats.failed++; return; }

    const path = join(CONFIG.paths.images, name);
    const publicPath = `/catalogue-images/${name}`;

    if (existsSync(path)) {
      stats.cached++;
      stats.bytes += statSync(path).size;
      update.run(publicPath, row.product_id, row.position);
      return;
    }

    const res = await politeFetchBinary(row.url);
    if (!res.ok || !res.bytes) { stats.failed++; return; }

    try {
      writeFileSync(path, res.bytes);
      stats.downloaded++;
      stats.bytes += res.bytes.byteLength;
      update.run(publicPath, row.product_id, row.position);
    } catch {
      stats.failed++;
    }
  }, (done, total) => log.progress(done, total, 'images'));

  log.info(
    `images: ${stats.downloaded} downloaded, ${stats.cached} already cached, ` +
    `${stats.failed} failed, ${(stats.bytes / 1e6).toFixed(1)} MB`,
  );
  return stats;
}
