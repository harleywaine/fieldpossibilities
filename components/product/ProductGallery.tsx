'use client';

import { useState } from 'react';
import type { Product } from '@/lib/catalogue/types.ts';
import { ProductImage } from '@/components/product/ProductImage.tsx';

/** Product imagery (brief §28/§40) — degrades gracefully when absent. */
export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const images = product.images;

  if (images.length === 0) {
    return (
      <div className="card p-4">
        <h2 className="mb-3 label">
          Product imagery
        </h2>
        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-ink-200 text-xs text-ink-400">
          No image published for this product
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="card p-4">
      <h2 className="mb-3 label">
        Product imagery
      </h2>
      <ProductImage product={{ ...product, images: [current] }} className="h-52 w-full" />
      {images.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {images.map((im, i) => (
            <button
              key={`${im.src}-${i}`}
              onClick={() => setActive(i)}
              aria-label={`Image ${i + 1}`}
              className={`h-12 w-12 overflow-hidden rounded border transition ${
                i === active ? 'border-signal-500 ring-2 ring-signal-500/25' : 'border-ink-200 '
              }`}
            >
              <img src={im.localPath ?? im.thumbnail ?? im.src} alt="" className="h-full w-full object-contain p-0.5" />
            </button>
          ))}
        </div>
      )}
      {current.isPlaceholder && (
        <p className="mt-2 text-[11px] text-ink-400">
          The catalogue uses a generic placeholder image for this product.
        </p>
      )}
    </div>
  );
}
