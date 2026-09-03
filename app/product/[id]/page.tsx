import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/db/client.ts';
import { extractRequirement } from '@/lib/ai/requirement.ts';
import { rankProduct } from '@/lib/ai/ranking.ts';
import { composeSearchAssessment } from '@/lib/ai/explain.ts';
import { Field, Chip, SourceNote, Button, AIBadge } from '@/components/ui/primitives.tsx';
import { EvidencePanel } from '@/components/evidence/EvidencePanel.tsx';
import { ProductGallery } from '@/components/product/ProductGallery.tsx';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const product = getProduct(id);
  if (!product) notFound();

  const query = (q ?? '').trim();
  const requirement = extractRequirement(query || product.name);
  const scored = rankProduct({ product, requirement, semanticScore: 0, lexicalScore: 0 });

  const technical = [
    ['Weight', product.weight],
    ['Dimensions', product.dimensions],
    ['Material', product.material],
    ['Condition', product.condition],
  ] as const;
  const hasTechnical = technical.some(([, v]) => v);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-5 flex items-center gap-2 text-xs text-ink-400">
        <Link href="/catalogue" className="hover:text-signal-600">Catalogue</Link>
        <span>/</span>
        {product.manufacturer && (
          <>
            <Link href={`/catalogue?manufacturer=${encodeURIComponent(product.manufacturer)}`} className="hover:text-signal-600">
              {product.manufacturer}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="mono truncate text-ink-500">{product.partNumber ?? product.id}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {/* -------------------------------------------------- overview */}
          <header>
            <div className="mono text-sm font-semibold text-signal-600">
              {product.partNumber ?? '—'}
            </div>
            {product.partNumberInTitle && (
              <p className="mt-1.5 rounded-md border border-[color:var(--color-caution-600)]/25 bg-[color:var(--color-caution-600)]/8 px-2.5 py-1.5 text-xs text-ink-700">
                <strong className="text-[color:var(--color-caution-600)] [color:var(--color-caution-400)]">
                  Source inconsistency:
                </strong>{' '}
                the catalogue records this part number as{' '}
                <span className="mono">{product.partNumber}</span>, while the product title reads{' '}
                <span className="mono">{product.partNumberInTitle}</span>. Both are shown as published;
                Field should confirm which applies.
              </p>
            )}
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-ink-950">
              {product.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.manufacturer && <Chip>{product.manufacturer}</Chip>}
              {product.aircraftModels.map((m) => <Chip key={m}>{m}</Chip>)}
              {product.maintenanceCategory && <Chip>{product.maintenanceCategory}</Chip>}
              {product.engine && <Chip>{product.engine}</Chip>}
              {product.ceMarked && <Chip tone="muted">CE marked in listing</Chip>}
            </div>
          </header>

          {product.description && (
            <section>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Overview</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {product.description}
              </p>
              <p className="mt-2 text-xs text-ink-400">Retrieved from source — Field International product description.</p>
            </section>
          )}

          {/* ------------------------------------ applicability + application */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Aircraft applicability
              </h2>
              <dl className="space-y-3">
                <Field label="Aircraft manufacturer" value={product.manufacturer} />
                <Field label="Aircraft models" value={product.aircraftModel} />
                <Field label="Variant" value={null} />
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                The catalogue records applicability at model level. It does not publish
                variant-level (e.g. -8 / -9 / -10) applicability.
              </p>
            </div>

            <div className="card p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Application</h2>
              <dl className="space-y-3">
                <Field label="Application" value={product.application} />
                <Field label="Maintenance category" value={product.maintenanceCategory} />
                <Field label="Equipment type" value={product.equipmentType} />
                <Field label="Engine" value={product.engine} />
              </dl>
            </div>
          </section>

          {/* --------------------------------------- technical + availability */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Technical information
              </h2>
              {hasTechnical ? (
                <dl className="space-y-3">
                  {technical.filter(([, v]) => v).map(([k, v]) => (
                    <Field key={k} label={k} value={v} />
                  ))}
                </dl>
              ) : (
                <p className="text-sm italic text-ink-400">
                  The catalogue publishes no technical specifications for this product.
                </p>
              )}
            </div>

            <div className="card p-4">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Availability &amp; lead time
              </h2>
              <dl className="space-y-3">
                <Field
                  label="Lead time"
                  value={product.leadTimeDays !== null ? `${product.leadTimeDays} days` : null}
                />
                <Field label="Availability" value={product.availability} />
                <Field label="Stock location" value={product.stockLocation} />
              </dl>
              {product.leadTimeDays !== null && (
                <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                  The catalogue lists a lead time of {product.leadTimeDays} days. This is catalogue
                  information, not a delivery commitment.
                </p>
              )}
            </div>
          </section>

          {/* ------------------------------------------------ AI assessment */}
          <section className="rounded-xl border border-signal-500/25 bg-signal-500/5 p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink-900">AI assessment</h2>
              <AIBadge />
            </div>
            <p className="text-sm leading-relaxed text-ink-800">
              {composeSearchAssessment(requirement, [scored])}
            </p>
            <p className="mt-3 border-t border-signal-500/15 pt-3 text-xs text-ink-500">
              AI-generated interpretation of the catalogue record above. Field should confirm current
              availability, suitability and delivery before purchase.
            </p>
          </section>

          {query && (
            <section>
              <EvidencePanel evidence={scored.evidence} gaps={scored.gaps} />
            </section>
          )}
        </div>

        {/* ------------------------------------------------------- sidebar */}
        <aside className="space-y-4">
          <ProductGallery product={product} />

          <div className="card p-4">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Source</h2>
            <p className="text-sm font-medium text-ink-800">
              Field International catalogue
            </p>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-signal-600 underline underline-offset-2"
            >
              View original product
              <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                <path d="M4.5 2.5h5v5M9.5 2.5 4 8M8 9.5H2.5V4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <dl className="mt-4 space-y-2 border-t border-ink-100 pt-3">
              <Field label="Source domain" value={product.sourceDomain} />
              <Field
                label="Retrieved"
                value={product.scrapedAt ? new Date(product.scrapedAt).toLocaleString('en-GB') : null}
              />
              <Field
                label="Detail page crawled"
                value={product.detailCrawled ? 'Yes' : 'Not yet crawled'}
              />
            </dl>
          </div>

          <div className="card space-y-2 p-4">
            <Button href={`/requests/new?ids=${product.id}`} className="w-full">Request a quote</Button>
            <Button href={`/compare?ids=${product.id}`} variant="secondary" className="w-full">
              Add to comparison
            </Button>
            <SourceNote url={product.sourceUrl} className="justify-center pt-1" />
          </div>
        </aside>
      </div>
    </div>
  );
}
