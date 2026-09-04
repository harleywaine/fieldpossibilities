import Link from 'next/link';
import type { Metadata } from 'next';
import { catalogueStats } from '@/lib/db/client.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'We didn’t write Field a proposal. We built one.',
};

/**
 * The opening. One claim, one proof, one action.
 *
 * The claim is the thing no other proposal on his desk can say: this is not a
 * deck about AI — it is a working system already running on Field's own
 * published catalogue. The counts are live from the database, not copy.
 */
export default function OpeningPage() {
  let products: number | null = null;
  try { products = catalogueStats().products; } catch { /* pre-ingestion */ }

  return (
    <div className="field-banner relative flex min-h-screen flex-col overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" />

      {/* ------------------------------------------------------------- bar */}
      <div className="relative z-10 mx-auto flex h-14 w-full max-w-5xl items-center px-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-[2px] border border-white/25">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-white" aria-hidden="true">
              <path d="M10 2.2 17.2 10 10 17.8 2.8 10z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".55" />
              <path d="M10 5.6 14.2 10 10 14.4 5.8 10z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="1.35" fill="currentColor" />
            </svg>
          </span>
          <span className="text-[12px] font-medium tracking-tight text-white/90">
            Field AI Opportunity Lab
          </span>
        </span>
        <Link
          href="/explore"
          className="ml-auto text-[11px] text-signal-300 transition-colors hover:text-white"
        >
          Skip the tour →
        </Link>
      </div>

      {/* ------------------------------------------------------------ body */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <div className="step-in flex items-center gap-3" style={{ animationDelay: '80ms' }}>
          <span className="h-px w-8 bg-signal-300/70" />
          <p className="text-[10px] font-semibold tracking-[0.18em] text-signal-300">
            PREPARED FOR FIELD INTERNATIONAL · SEPTEMBER 2026
          </p>
        </div>

        <h1
          className="step-in mt-7 max-w-3xl text-[2.6rem] font-light leading-[1.05] text-white sm:text-[4rem]"
          style={{ animationDelay: '220ms' }}
        >
          We didn’t write a proposal.
          <br />
          <span className="text-signal-300">We built one.</span>
        </h1>

        <p
          className="step-in mt-7 max-w-2xl text-[16px] font-light leading-relaxed text-signal-100"
          style={{ animationDelay: '400ms' }}
        >
          A working AI system, running on Field’s own published catalogue —
          {products ? ` all ${products.toLocaleString()} products of it` : ' every product in it'}.
          Nothing in the next six minutes is a mock-up.
        </p>

        <div className="step-in mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: '560ms' }}>
          <Link
            href="/tour/watch"
            className="rounded-[2px] bg-action-600 px-7 py-3 text-[14px] font-medium text-white transition-colors hover:bg-action-500"
          >
            Begin →
          </Link>
          <span className="mono text-[10.5px] tracking-[0.08em] text-signal-300">
            SIX CHAPTERS · ABOUT SIX MINUTES · SELF-GUIDED
          </span>
        </div>
      </div>

      {/* ----------------------------------------------------------- proof */}
      <div className="relative z-10 border-t border-white/10">
        <div className="mx-auto grid w-full max-w-5xl gap-px overflow-hidden px-5 py-6 sm:grid-cols-3 sm:px-8">
          <Proof
            figure={products ? products.toLocaleString() : '—'}
            line="of your products, ingested from your public catalogue"
          />
          <Proof figure="100%" line="of the claims it makes are traced to a source you can open" />
          <Proof figure="0" line="internal systems were needed to build any of this" />
        </div>
      </div>
    </div>
  );
}

function Proof({ figure, line }: { figure: string; line: string }) {
  return (
    <div className="py-2 sm:px-2">
      <div className="mono figure text-[22px] font-medium text-white">{figure}</div>
      <p className="mt-1 max-w-[16rem] text-[11.5px] leading-relaxed text-signal-300">{line}</p>
    </div>
  );
}
