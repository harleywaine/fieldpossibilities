import Link from 'next/link';
import type { Metadata } from 'next';
import { TourShell, ChapterHead } from '@/components/tour/TourShell.tsx';
import { LEVELS } from '@/lib/levels.ts';

export const metadata: Metadata = { title: 'The way in — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

const PHASES = [
  { when: 'NOW',    risk: 'Low risk — public data only, no internal access needed', level: LEVELS[0] },
  { when: 'NEXT',   risk: 'Medium — internal documents, with permissions designed in', level: LEVELS[1] },
  { when: 'THEN',   risk: 'Medium–high — process change, humans keep every decision', level: LEVELS[2] },
  { when: 'FUTURE', risk: 'Advisory only — connects what the earlier phases produce', level: LEVELS[3] },
];

export default function NextChapter() {
  return (
    <TourShell chapter="next" width="wide">
      <ChapterHead
        n={6}
        label="Next"
        title="Start small. Prove value. Integrate progressively."
        lede={
          <>
            Nothing you’ve seen asks Field to bet on AI. Each phase stands on the value of the one
            before it — and the first phase runs on data you already publish, which is why it
            carries almost no risk at all.
          </>
        }
      />

      {/* ---------------------------------------------------------- roadmap */}
      <ol className="grid gap-px overflow-hidden rounded-[2px] border border-ink-100 bg-ink-100 md:grid-cols-4">
        {PHASES.map((p) => (
          <li key={p.when} className="flex flex-col bg-white p-4">
            <span className="mono text-[10px] tracking-[0.14em] text-signal-400">{p.when}</span>
            <span className="mt-2 text-[13.5px] font-medium text-ink-900">{p.level.title}</span>
            <span className="mt-0.5 text-[12px] text-signal-600">{p.level.strap}</span>
            <span className="rule mt-3 pt-2.5 text-[11px] leading-relaxed text-ink-500">{p.risk}</span>
          </li>
        ))}
      </ol>

      {/* ------------------------------------------------------------ close */}
      <section className="ticked mt-10 border border-ink-100 bg-white px-7 py-9 sm:px-10">
        <h2 className="max-w-2xl text-[24px] font-light leading-snug text-ink-950">
          Everything you have just used was built from your public catalogue alone — no access, no
          integrations, no meetings.
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] font-light leading-relaxed text-ink-600">
          Treat it as the floor of what’s possible, not the ceiling. The next step is a short piece
          of joint work: map Field’s real workflows, systems and data against what you’ve just
          seen, and identify where this pays back first — with the assumptions in the value model
          replaced by your own numbers.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <span className="rounded-[2px] bg-action-600 px-6 py-3 text-[14px] font-medium text-white">
            Build Field’s AI Opportunity Map
          </span>
          <p className="max-w-[210px] text-[11.5px] leading-relaxed text-ink-400">
            Reply to the message this link arrived in — we’ll take it from there.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- forwarding layer */}
      <section className="mt-12">
        <p className="label mb-1.5">Explore the full platform</p>
        <p className="mb-5 max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Everything in the tour sits on a working platform you can hand around. Forward this link
          to anyone — the tour restarts from the beginning, and the pages below go deeper.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <IndexGroup
            title="The demonstrations"
            items={[
              { href: '/customer-ai', label: 'Customer Intelligence', note: 'The full customer search experience — products, comparison, quoting.' },
              { href: '/knowledge-ai', label: 'Knowledge Intelligence', note: 'The internal console, with free questioning of the synthetic records.' },
              { href: '/workflow-ai', label: 'Workflow Automation', note: 'RFQ processing with the exception queue and work package.' },
              { href: '/operating-layer', label: 'AI Operating Layer', note: 'The operations brief, recommendation and implementation roadmap.' },
              { href: '/roi', label: 'The full value model', note: 'Every assumption exposed and adjustable, per process.' },
            ]}
          />
          <IndexGroup
            title="For your technical team"
            items={[
              { href: '/architecture', label: 'Architecture', note: 'How each level is built, and the principles that keep it honest.' },
              { href: '/ingestion', label: 'Ingestion report', note: 'The catalogue crawl: coverage, field population, data-quality notes.' },
              { href: '/catalogue', label: 'Browse the catalogue', note: 'The conventional faceted view over the same ingested data.' },
              { href: '/explore', label: 'Platform overview', note: 'The four levels side by side, with status and complexity.' },
            ]}
          />
        </div>
      </section>
    </TourShell>
  );
}

function IndexGroup({
  title, items,
}: { title: string; items: Array<{ href: string; label: string; note: string }> }) {
  return (
    <div className="card p-5">
      <p className="label mb-3">{title}</p>
      <ul className="divide-y divide-ink-100">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group flex items-baseline gap-3 py-2.5">
              <span className="text-[13px] font-medium text-signal-600 transition-colors group-hover:text-action-600">
                {i.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-400">{i.note}</span>
              <span aria-hidden="true" className="text-[11px] text-ink-300 transition-colors group-hover:text-action-600">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
