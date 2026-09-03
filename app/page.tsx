import Link from 'next/link';
import { LEVELS } from '@/lib/levels.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';
import { catalogueStats } from '@/lib/db/client.ts';
import { demoStats } from '@/lib/db/demo.ts';
import { computeRoi } from '@/lib/roi/model.ts';

export const dynamic = 'force-dynamic';

export default function ExplorePage() {
  let cat = null, demo = null, roi = null;
  try { cat = catalogueStats(); } catch { /* not ingested */ }
  try { demo = demoStats(); } catch { /* not generated */ }
  try { roi = computeRoi(); } catch { /* not generated */ }

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <section className="field-banner relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-signal-300">
            Field AI Opportunity Lab
          </p>
          <h1 className="max-w-3xl text-4xl font-light leading-[1.1] tracking-tight text-white sm:text-5xl">
            What could AI do for Field?
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-light leading-relaxed text-signal-100">
            A working exploration of how artificial intelligence could improve the way Field sells,
            operates and uses its collective knowledge.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-signal-300">
            Each level below is interactive. The first runs against Field’s real published
            catalogue; the rest use clearly-labelled synthetic data to model internal processes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/customer-ai"
              className="rounded-[3px] bg-action-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-action-500"
            >
              Start with the first demo
            </Link>
            <Link
              href="/roi"
              className="rounded-[3px] border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              See the opportunity model
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ progression */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <ol className="mb-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {LEVELS.map((l, i) => (
            <li key={l.slug} className="flex items-center gap-2">
              <Link
                href={l.href}
                className="rounded-[3px] border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-signal-700 transition hover:border-signal-300 hover:text-action-600"
              >
                <span className="mr-2 text-[11px] tabular-nums text-ink-400">0{l.n}</span>
                {l.verb}
              </Link>
              {i < LEVELS.length - 1 && (
                <svg viewBox="0 0 18 10" className="h-2.5 w-4 text-ink-300" aria-hidden="true">
                  <path d="M0 5h15M11 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ol>

        <div className="grid gap-4 md:grid-cols-2">
          {LEVELS.map((l) => (
            <article key={l.slug} className="card flex flex-col p-5 transition hover:border-signal-300">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[3px] bg-signal-600/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-signal-600">
                  Level {l.n}
                </span>
                <DataBadge kind={l.dataKind} />
              </div>

              <h2 className="text-lg font-medium text-ink-900">{l.title}</h2>
              <p className="mt-0.5 text-sm font-medium text-signal-600">{l.strap}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{l.description}</p>
              <p className="mt-3 rounded-[3px] bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
                {l.example}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-100 pt-3 text-xs">
                <div>
                  <dt className="text-ink-400">Status</dt>
                  <dd className="mt-0.5 font-medium text-ink-700">{l.status}</dd>
                </div>
                <div>
                  <dt className="text-ink-400">Complexity</dt>
                  <dd className="mt-0.5 font-medium text-ink-700">{l.complexity}</dd>
                </div>
              </dl>

              <ul className="mt-3 space-y-1">
                {l.value.map((v) => (
                  <li key={v} className="flex items-start gap-1.5 text-xs text-ink-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-400" />
                    {v}
                  </li>
                ))}
              </ul>

              <Link
                href={l.href}
                className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-medium text-action-600 transition hover:gap-2.5"
              >
                {l.cta}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ what's real */}
      <section className="mx-auto mt-14 max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Fact
            label="Real catalogue products"
            value={cat ? cat.products.toLocaleString() : '—'}
            note="Ingested from Field’s public catalogue, with a link back to every source page."
            tone="real"
          />
          <Fact
            label="Synthetic internal documents"
            value={demo ? String(demo.documents) : '—'}
            note="Fabricated records modelling RFQs, quotes, emails and technical notes."
            tone="synthetic"
          />
          <Fact
            label="Illustrative annual opportunity"
            value={roi ? `£${roi.totals.productivityValueGbp.toLocaleString()}` : '—'}
            note="Computed from stated synthetic assumptions. Not a Field financial estimate."
            tone="synthetic"
          />
        </div>
      </section>

      {/* -------------------------------------------------------- the point */}
      <section className="mx-auto mt-14 max-w-4xl px-4 sm:px-6">
        <div className="rounded-[3px] border border-signal-600/25 bg-signal-600/5 p-6">
          <h2 className="text-lg font-medium text-ink-900">
            The opportunity isn’t one AI product.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            It is to progressively embed intelligence into the way Field already works — starting
            with a low-risk, customer-facing capability that runs on data Field already publishes,
            and extending inwards only as each step proves its value.
          </p>
          <p className="mt-3 text-sm font-medium text-signal-700">
            Start small. Prove value. Integrate progressively.
          </p>
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'real' | 'synthetic' }) {
  return (
    <div className="card p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${tone === 'real' ? 'text-[color:var(--color-strong-600)]' : 'text-signal-700'}`}>
        {value}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  );
}
