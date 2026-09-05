import Link from 'next/link';
import type { Metadata } from 'next';
import { catalogueStats } from '@/lib/db/client.ts';
import { SurfaceSearch } from '@/components/depth/SurfaceSearch.tsx';
import { CrossSection } from '@/components/depth/CrossSection.tsx';
import { Mark } from '@/components/depth/DepthShell.tsx';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'Start with something simple. Then go deeper.',
};

/**
 * The surface. The simple thing IS the front door: a search box on Field's
 * real catalogue that demonstrates itself, then hands over. Below the
 * waterline, the cross-section — the whole machine visible at once,
 * darkening with depth. No chapters, no pitch. A place to explore.
 */
export default function SurfacePage() {
  let products: number | null = null;
  try { products = catalogueStats().products; } catch { /* pre-ingestion */ }

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {/* --------------------------------------------------- above the water */}
      <section className="field-banner relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="relative z-10 mx-auto flex h-14 w-full max-w-4xl items-center px-5 sm:px-8">
          <span className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[12px] font-medium tracking-tight text-white/90">
              Field AI Opportunity Lab
            </span>
          </span>
          <Link
            href="/explore"
            className="ml-auto text-[11px] text-signal-300 transition-colors hover:text-white"
          >
            The full platform →
          </Link>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
          <div className="step-in flex items-center gap-3" style={{ animationDelay: '60ms' }}>
            <span className="h-px w-8 bg-signal-300/70" />
            <p className="text-[10px] font-semibold tracking-[0.18em] text-signal-300">
              PREPARED FOR FIELD INTERNATIONAL
            </p>
          </div>
          <h1
            className="step-in mt-6 text-[2.5rem] font-light leading-[1.06] text-white sm:text-[3.4rem]"
            style={{ animationDelay: '180ms' }}
          >
            Start with something simple.
          </h1>
          <p
            className="step-in mt-5 max-w-xl text-[15px] font-light leading-relaxed text-signal-100"
            style={{ animationDelay: '320ms' }}
          >
            A question, asked the way an engineer would ask it, against Field’s published
            catalogue — {products ? `all ${products.toLocaleString()} products of it` : 'every product in it'}.
            Nothing here is mocked.
          </p>
        </div>
      </section>

      {/* -------------------- the box, straddling the waterline ------------- */}
      <section className="relative mx-auto -mt-14 w-full max-w-4xl px-5 sm:px-8">
        <SurfaceSearch />
      </section>

      {/* ----------------------------------------------------- the descent */}
      <section className="mx-auto mt-20 w-full max-w-4xl flex-1 px-5 pb-20 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-signal-400" />
          <p className="mono text-[10px] tracking-[0.18em] text-ink-400">SECTION VIEW</p>
        </div>
        <h2 className="mt-4 text-[26px] font-light leading-snug text-ink-950">
          That was the simple end.
          <br />
          <span className="text-ink-400">The rest of the machine is below.</span>
        </h2>
        <p className="mt-3 max-w-xl text-[13.5px] font-light leading-relaxed text-ink-500">
          One system in section: the deeper the layer, the more it does — and the more it needs.
          Enter anywhere.
        </p>

        <div className="mt-8">
          <CrossSection />
        </div>

        <p className="mt-5 text-[11.5px] leading-relaxed text-ink-400">
          The surface runs on Field’s real public data. The layers beneath model the inside of a
          business with clearly-labelled synthetic records — the intelligence is the same
          throughout. For the engineering itself, see the{' '}
          <Link href="/architecture" className="text-signal-600 underline decoration-dotted underline-offset-[3px] hover:text-action-600">
            architecture
          </Link>.
        </p>
      </section>
    </div>
  );
}
