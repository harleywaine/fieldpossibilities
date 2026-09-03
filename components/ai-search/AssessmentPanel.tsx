import { AIBadge } from '@/components/ui/primitives.tsx';

/** AI-generated interpretation, visually distinct from retrieved source data (§29). */
export function AssessmentPanel({
  text, provider, disclaimer, title = 'AI assessment',
}: { text: string; provider?: string; disclaimer: string; title?: string }) {
  return (
    <section className="rounded-xl border border-signal-500/25 bg-signal-500/5 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        <AIBadge provider={provider} />
      </div>
      <p className="text-sm leading-relaxed text-ink-800">{text}</p>
      <p className="mt-3 border-t border-signal-500/15 pt-3 text-xs text-ink-500">
        {disclaimer}
      </p>
    </section>
  );
}
