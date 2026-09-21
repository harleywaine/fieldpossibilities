'use client';

import { useEffect, useState } from 'react';
import { CUSTOMER_QUERY, formatMinutes } from '@/lib/journey.ts';

/* ------------------------------------------------------------------ search */

/**
 * The customer's question types itself, then runs for real. The request was
 * fired when the journey loaded, so results are usually waiting by the time
 * the typing finishes. After that the box is theirs.
 */
export function SearchStage({
  initial,
  onSearch,
}: {
  initial: any | null;
  onSearch: (q: string) => Promise<any>;
}) {
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [data, setData] = useState<any>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (initial && !data) setData(initial); }, [initial, data]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(CUSTOMER_QUERY); setTypingDone(true); return;
    }
    let cancelled = false;
    const startAt = Date.now() + 500;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      // Anchored to the wall clock: throttled timers make it chunkier, never slower.
      const n = Math.max(0, Math.min(CUSTOMER_QUERY.length, Math.floor(((Date.now() - startAt) / 1000) * 38)));
      setTyped(CUSTOMER_QUERY.slice(0, n));
      if (n >= CUSTOMER_QUERY.length) { setTypingDone(true); return; }
      timer = setTimeout(tick, 40);
    };
    timer = setTimeout(tick, 40);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const ask = async () => {
    const q = typed.trim();
    if (!q || busy) return;
    setBusy(true);
    try { setData(await onSearch(q)); } finally { setBusy(false); }
  };

  const results = (data?.results ?? []).slice(0, 3);
  const show = typingDone && data;

  return (
    <div>
      <div className="flex items-start gap-3 border-b border-ink-200 pb-3">
        <span className="mono mt-[3px] text-[11px] text-ink-300">Q</span>
        {typingDone ? (
          <textarea
            value={typed}
            rows={2}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(); } }}
            aria-label="Ask your own question"
            className="min-h-0 flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-ink-900 outline-none"
          />
        ) : (
          <p className="flex-1 text-[16px] leading-relaxed text-ink-900">
            {typed}
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] animate-pulse bg-signal-600" />
          </p>
        )}
        {typingDone && (
          <button
            onClick={() => void ask()}
            disabled={busy}
            className="mono shrink-0 text-[11px] tracking-[0.08em] text-signal-600 transition-colors hover:text-action-600 disabled:opacity-40"
          >
            {busy ? 'SEARCHING…' : 'ASK ↵'}
          </button>
        )}
      </div>

      <div className="min-h-[220px]">
        {show && (
          <>
            <ul className="mt-2">
              {results.map((r: any, i: number) => (
                <li
                  key={r.product.id}
                  className="step-in flex items-baseline gap-4 border-b border-ink-100 py-3.5"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <span className="mono w-24 shrink-0 text-[13px] text-signal-600">
                    {r.product.partNumber ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-700">
                    {r.product.name}
                  </span>
                  <a
                    href={r.product.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="shrink-0 text-[11px] text-ink-400 transition-colors hover:text-signal-600"
                  >
                    Verify ↗
                  </a>
                </li>
              ))}
            </ul>
            <p className="step-in mt-4 text-[12px] text-ink-400" style={{ animationDelay: '420ms' }}>
              Real Field products, found in {data.trace.durationMs} ms. Each links to its page on
              fieldinternational.com. The box above is live — ask your own.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- enquiry */

export function EnquiryStage({ pkg }: { pkg: any | null }) {
  const parts: string[] = (pkg?.lines ?? []).map((l: any) => l.requestedPart).filter(Boolean);
  const shown = parts.slice(0, 6);
  return (
    <div className="border-l border-ink-200 pl-5">
      <p className="mono text-[11px] text-ink-400">procurement@singaporeaeromro.example</p>
      <p className="mt-1 text-[15px] text-ink-900">RFQ — Boeing 787 GEnx tooling</p>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-600">
        We are preparing a heavy maintenance programme and require pricing and availability for
        the attached items. Our maintenance slot opens in ten weeks.
      </p>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
        {shown.map((p, i) => (
          <span key={`${p}-${i}`} className="step-in mono text-[12px] text-ink-500" style={{ animationDelay: `${300 + i * 70}ms` }}>
            {p}
          </span>
        ))}
        {parts.length > shown.length && (
          <span className="step-in mono text-[12px] text-ink-300" style={{ animationDelay: '750ms' }}>
            + {parts.length - shown.length} more
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- research */

const RESEARCH_ROWS: Array<{ label: string; show: string }> = [
  { label: 'Customer', show: 'Customer' },
  { label: 'Internal owner', show: 'Account owner' },
  { label: 'Previous quote', show: 'Last quote' },
  { label: 'Potential issue', show: 'Worth knowing' },
];

export function ResearchStage({ brief }: { brief: any | null }) {
  if (!brief) return <Pending />;
  const field = (l: string) => brief.fields.find((f: any) => f.label === l);
  const docs = brief.retrieval?.documents?.length ?? 0;
  return (
    <div>
      <p className="mono mb-2 text-[11px] text-ink-400">
        {docs} internal documents read in {brief.retrieval?.trace?.durationMs ?? '—'} ms
      </p>
      <dl>
        {RESEARCH_ROWS.map((row, i) => {
          const f = field(row.label);
          if (!f) return null;
          return (
            <div
              key={row.label}
              className="step-in grid grid-cols-[8.5rem_1fr] gap-4 border-b border-ink-100 py-3.5"
              style={{ animationDelay: `${i * 140}ms` }}
            >
              <dt className="text-[12px] text-ink-400">{row.show}</dt>
              <dd>
                <p className="text-[14px] leading-snug text-ink-800">{f.value}</p>
                {f.citations?.[0] && (
                  <p className="mono mt-1 text-[10.5px] text-ink-300">from {f.citations[0].path}</p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------- quote */

export function QuoteStage({ pkg }: { pkg: any | null }) {
  if (!pkg) return <Pending />;
  const lines: any[] = pkg.lines;
  const colour = (s: string) =>
    s === 'matched' ? 'bg-signal-600' : s === 'review' ? 'bg-[color:var(--color-caution-500)]' : 'bg-action-600';
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {lines.map((l, i) => (
          <span
            key={l.line}
            title={`${l.requestedPart ?? ''} — ${l.status}`}
            className={`step-in h-9 w-9 rounded-[2px] ${colour(l.status)}`}
            style={{ animationDelay: `${i * 85}ms` }}
          />
        ))}
      </div>
      <dl className="step-in mt-6 space-y-2" style={{ animationDelay: `${lines.length * 85 + 150}ms` }}>
        <Legend swatch="bg-signal-600" n={pkg.counts.matched} text="matched to the catalogue automatically" />
        <Legend swatch="bg-[color:var(--color-caution-500)]" n={pkg.counts.review} text="matched, but something needs checking" />
        <Legend swatch="bg-action-600" n={pkg.counts.unmatched} text="not in the catalogue — not guessed" />
      </dl>
    </div>
  );
}

function Legend({ swatch, n, text }: { swatch: string; n: number; text: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[1px] ${swatch}`} />
      <span className="mono w-6 text-[14px] text-ink-900">{n}</span>
      <span className="text-[13px] text-ink-500">{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ review */

export function ReviewStage({
  pkg, reviewed, onReview,
}: { pkg: any | null; reviewed: Set<number>; onReview: (line: number) => void }) {
  if (!pkg) return <Pending />;
  const flagged: any[] = pkg.lines.filter((l: any) => l.status !== 'matched');
  const all = flagged.every((l) => reviewed.has(l.line));
  return (
    <div>
      <ul>
        {flagged.map((l, i) => {
          const done = reviewed.has(l.line);
          return (
            <li
              key={l.line}
              className="step-in border-b border-ink-100 py-4"
              style={{ animationDelay: `${i * 140}ms` }}
            >
              <div className="flex items-baseline gap-4">
                <span className="mono w-24 shrink-0 text-[13px] text-signal-600">{l.requestedPart}</span>
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-600">{l.reviewReason}</p>
              </div>
              <div className="mt-2.5 pl-28">
                {done ? (
                  <span className="mono text-[11px] tracking-[0.06em] text-[color:var(--color-strong-600)]">
                    ✓ REVIEWED BY ENGINEER
                  </span>
                ) : (
                  <button
                    onClick={() => onReview(l.line)}
                    className="rounded-[2px] border border-ink-300 px-3 py-1 text-[12px] text-ink-700 transition-colors hover:border-signal-600 hover:text-signal-700"
                  >
                    Mark as reviewed
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={`mt-5 text-[13px] transition-opacity duration-500 ${all ? 'text-ink-700 opacity-100' : 'opacity-0'}`}>
        All three reviewed. Nothing reaches the customer without this step.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- supplier */

export function SupplierStage({ brief }: { brief: any | null }) {
  const f = brief?.fields?.find((x: any) => x.label === 'Latest supplier information');
  const positions: Array<{ value: string; path: string }> = f?.conflict?.positions?.map((p: any) => ({
    value: p.value, path: p.citation.path,
  })) ?? [
    { value: '8–10 weeks — 2026-08-11', path: 'emails/meridian-lead-time-update.txt' },
    { value: '12 weeks — 2025-07-05', path: 'suppliers/meridian-genx-lead-times.docx' },
  ];
  const [newer, older] = positions;
  return (
    <div className="grid gap-px overflow-hidden rounded-[2px] border border-ink-200 bg-ink-200 sm:grid-cols-2">
      <Position tag="Newer" v={newer} />
      <Position tag="Older — superseded" v={older} muted />
      <div className="step-in col-span-full bg-white px-5 py-3.5" style={{ animationDelay: '420ms' }}>
        <p className="text-[13px] text-ink-600">
          <span className="mono mr-2 text-[11px] text-[color:var(--color-caution-600)]">FLAGGED</span>
          A person confirms with the supplier in writing before any date is given.
        </p>
      </div>
    </div>
  );
}

function Position({ tag, v, muted = false }: { tag: string; v?: { value: string; path: string }; muted?: boolean }) {
  if (!v) return null;
  const [amount, date] = v.value.split(' — ');
  return (
    <div className={`step-in bg-white px-5 py-5 ${muted ? 'opacity-60' : ''}`} style={{ animationDelay: muted ? '200ms' : '0ms' }}>
      <p className="mono text-[10.5px] tracking-[0.08em] text-ink-400">{tag.toUpperCase()}</p>
      <p className={`mt-2 text-[26px] font-light text-ink-900 ${muted ? 'line-through decoration-ink-300' : ''}`}>{amount}</p>
      <p className="mono mt-1 text-[11px] text-ink-400">{date} · {v.path}</p>
    </div>
  );
}

/* ------------------------------------------------------------- manufacture */

/** Ten weeks, in minutes: the scale both bars are drawn against. */
const TEN_WEEKS_MIN = 10 * 7 * 24 * 60;

export function ManufactureStage({ peopleMinutes }: { peopleMinutes: number }) {
  const pct = (peopleMinutes / TEN_WEEKS_MIN) * 100;
  return (
    <div className="space-y-6">
      <Bar label="People’s time on this enquiry, with AI" value={formatMinutes(peopleMinutes)} pct={pct} colour="bg-signal-600" />
      <Bar label="Making the tool" value="8–10 weeks" pct={100} colour="bg-ink-800" delay={300} />
      <p className="step-in text-[12px] leading-relaxed text-ink-400" style={{ animationDelay: '900ms' }}>
        Elapsed time, one scale. At true width the blue line would be {pct.toFixed(2)}% of the bar
        — it is widened here so you can see it at all. The ten-week deadline fits the confirmed
        lead time, just.
      </p>
    </div>
  );
}

function Bar({ label, value, pct, colour, delay = 0 }: { label: string; value: string; pct: number; colour: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 80 + delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="text-[12.5px] text-ink-500">{label}</span>
        <span className="mono text-[13px] text-ink-900">{value}</span>
      </div>
      <div className="h-2 bg-ink-100">
        <div
          className={`h-full ${colour} transition-[width] duration-[1400ms] ease-out`}
          style={{ width: `${w}%`, minWidth: w ? 3 : 0 }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

function Pending() {
  return <p className="mono text-[11px] tracking-[0.08em] text-ink-300">LOADING…</p>;
}
