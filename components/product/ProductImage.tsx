'use client';

import { useState } from 'react';
import type { Product } from '@/lib/catalogue/types.ts';

/**
 * Product imagery must never break a page (brief §40). Missing, placeholder and
 * failed images all fall back to a neutral marker rather than an error.
 */
export function ProductImage({ product, className = '' }: { product: Product; className?: string }) {
  const [failed, setFailed] = useState(false);
  const image = product.images.find((i) => !i.isPlaceholder) ?? product.images[0];
  const usable = image && !failed;
  // Prefer the locally cached copy so the demo renders without network access.
  const src = image ? (image.localPath ?? image.thumbnail ?? image.src) : '';

  return (
    <div className={`relative overflow-hidden rounded-lg border border-ink-100 bg-ink-50 dark:border-ink-800 dark:bg-ink-850 ${className}`}>
      {usable ? (
        <img
          src={src}
          alt={image.alt ?? product.name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-ink-300 dark:text-ink-600">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <rect x="4" y="7" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="m7 21 5.5-6 4 4.5 3.5-3 5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="1.6" fill="currentColor" />
          </svg>
        </div>
      )}
      {image?.isPlaceholder && !failed && (
        <span className="absolute bottom-0 inset-x-0 bg-ink-900/70 px-1 py-0.5 text-center text-[9px] text-white">
          placeholder
        </span>
      )}
    </div>
  );
}
