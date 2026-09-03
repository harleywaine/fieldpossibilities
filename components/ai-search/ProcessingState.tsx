/**
 * Processing UI (brief §26).
 *
 * The steps and counts are the REAL retrieval trace — only their reveal is
 * paced. The staging is done entirely in CSS with staggered animation delays
 * rather than JavaScript state, so the content is present and readable in the
 * server-rendered HTML: nothing is gated behind hydration, and a browser with
 * reduced-motion (or no JS at all) simply sees everything at once.
 */

const STEP_MS = 170;
const RESULTS_GAP_MS = 260;

export interface ProcessingProps {
  understood: Array<{ label: string; value: string; note?: string }>;
  steps: Array<{ label: string; detail: string }>;
  /** Records that clear the relevance bar — strong + potential matches. */
  recordCount: number;
  /** Wider set that is relevant on some dimension only. */
  alternativeCount: number;
  durationMs: number;
  children: React.ReactNode;
}

export function ProcessingState({
  understood, steps, recordCount, alternativeCount, durationMs, children,
}: ProcessingProps) {
  const total = understood.length + steps.length;
  const delay = (i: number) => ({ animationDelay: `${i * STEP_MS}ms` });

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Understanding requirement">
          {understood.length > 0 ? (
            understood.map((u, i) => (
              <Line key={u.label} style={delay(i)} label={u.label} value={u.value} note={u.note} />
            ))
          ) : (
            <p className="text-sm text-ink-400">
              No specific aircraft, application or delivery constraint detected — searching on
              description text alone.
            </p>
          )}
        </Panel>

        <Panel title="Searching catalogue">
          {steps.map((s, i) => (
            <Line key={s.label} style={delay(understood.length + i)} label={s.label} value={s.detail} />
          ))}
        </Panel>
      </div>

      <div
        className="step-in mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-ink-100 bg-white px-4 py-3"
        style={delay(total)}
      >
        <span className="text-lg font-semibold tabular-nums text-ink-900">
          {recordCount.toLocaleString()}
        </span>
        <span className="text-sm text-ink-600">
          relevant catalogue {recordCount === 1 ? 'record' : 'records'} identified
        </span>
        {alternativeCount > 0 && (
          <span className="text-xs text-ink-400">
            + {alternativeCount.toLocaleString()} partial {alternativeCount === 1 ? 'match' : 'matches'}
          </span>
        )}
        <span className="ml-auto text-xs tabular-nums text-ink-400">{durationMs} ms</span>
      </div>

      <div className="step-in mt-8" style={{ animationDelay: `${total * STEP_MS + RESULTS_GAP_MS}ms` }}>
        {children}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Line({
  style, label, value, note,
}: { style: React.CSSProperties; label: string; value: string; note?: string }) {
  return (
    <div className="step-in" style={style}>
      <div className="flex items-start gap-2">
        <svg viewBox="0 0 14 14" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-strong-600)] [color:var(--color-strong-400)]" aria-hidden="true">
          <path d="m2.5 7.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <span className="text-sm font-medium text-ink-800">{label}</span>
          <span className="text-sm text-ink-500"> — {value}</span>
          {note && (
            <p className="mt-1 rounded-md bg-[color:var(--color-caution-600)]/8 px-2 py-1 text-xs text-[color:var(--color-caution-600)] [color:var(--color-caution-400)]">
              {note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
