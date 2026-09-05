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
      <section className="field-banner hero-edge relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pt-24">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-signal-300/60" />
            <p className="text-[10px] font-semibold tracking-[0.18em] text-signal-300">
              FIELD AI OPPORTUNITY LAB
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl text-[2.75rem] font-light leading-[1.06] text-white sm:text-[3.5rem]">
            What could AI do for Field?
          </h1>

          <p className="mt-6 max-w-2xl text-[17px] font-light leading-relaxed text-signal-100">
            A working exploration of how artificial intelligence could improve the way Field sells,
            operates and uses its collective knowledge.
          </p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-signal-300/90">
            Each level is interactive. The first runs against Field’s real published catalogue; the
            rest use clearly-labelled synthetic data to model internal processes.
          </p>

          <div className="mt-9 flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="rounded-[2px] bg-action-600 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-action-500"
            >
              See the four demos
            </Link>
            <Link
              href="/customer-ai"
              className="rounded-[2px] border border-white/25 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:border-white/50 hover:bg-white/[0.07]"
            >
              Go straight to the first demo
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ progression */}
      <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <ol className="mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border border-ink-100 bg-ink-100 md:grid-cols-4">
          {LEVELS.map((l) => (
            <li key={l.slug}>
              <Link
                href={l.href}
                className="group flex h-full flex-col bg-white px-4 py-3.5 transition-colors hover:bg-signal-50"
              >
                <span className="mono text-[10px] text-ink-300">0{l.n}</span>
                <span className="mt-1 text-[13px] font-medium tracking-[0.05em] text-ink-800 transition-colors group-hover:text-signal-600">
                  {l.verb}
                </span>
                <span className="mt-0.5 text-[11px] text-ink-400">{l.strap}</span>
              </Link>
            </li>
          ))}
        </ol>

        <div className="grid gap-5 md:grid-cols-2">
          {LEVELS.map((l) => (
            <article key={l.slug} className="card card-hover flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <span className="mono text-[11px] text-signal-400">0{l.n}</span>
                  <span className="label">{l.verb}</span>
                </div>
                <DataBadge kind={l.dataKind} />
              </div>

              <h2 className="mt-4 text-[19px] font-medium text-ink-900">{l.title}</h2>
              <p className="mt-1 text-[13px] font-medium text-signal-600">{l.strap}</p>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-600">{l.description}</p>

              <p className="mt-4 border-l-2 border-ink-100 py-0.5 pl-3 text-[12px] leading-relaxed text-ink-500">
                {l.example}
              </p>

              <dl className="rule mt-5 grid grid-cols-2 gap-4 pt-4">
                <div>
                  <dt className="label">Status</dt>
                  <dd className="mt-1 text-[12px] text-ink-700">{l.status}</dd>
                </div>
                <div>
                  <dt className="label">Complexity</dt>
                  <dd className="mt-1 text-[12px] text-ink-700">{l.complexity}</dd>
                </div>
              </dl>

              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {l.value.map((v) => (
                  <li key={v} className="flex items-start gap-2 text-[12px] text-ink-500">
                    <span className="mt-[7px] h-px w-2 shrink-0 bg-signal-300" />
                    {v}
                  </li>
                ))}
              </ul>

              <Link
                href={l.href}
                className="rule mt-5 inline-flex items-center gap-2 pt-4 text-[13px] font-medium text-action-600 transition-colors hover:text-action-500"
              >
                {l.cta}
                <span aria-hidden="true" className="transition-transform">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ what's real */}
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
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
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <div className="ticked border border-ink-100 bg-white px-8 py-10 sm:px-12">
          <h2 className="max-w-2xl text-[26px] font-light leading-snug text-ink-900">
            The opportunity isn’t one AI product.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] font-light leading-relaxed text-ink-600">
            It is to progressively embed intelligence into the way Field already works — starting
            with a low-risk, customer-facing capability that runs on data Field already publishes,
            and extending inwards only as each step proves its value.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="h-px w-8 bg-signal-300" />
            <p className="text-[13px] font-medium tracking-[0.02em] text-signal-700">
              Start small. Prove value. Integrate progressively.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({ label, value, note, tone }: { label: string; value: string; note: string; tone: 'real' | 'synthetic' }) {
  return (
    <div className="card p-6">
      <div className="label">{label}</div>
      <div className={`figure mt-2 text-[2rem] font-light leading-none ${tone === 'real' ? 'text-[color:var(--color-strong-600)]' : 'text-signal-700'}`}>
        {value}
      </div>
      <p className="rule mt-4 pt-3 text-[12px] leading-relaxed text-ink-500">{note}</p>
    </div>
  );
}
