'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { FINDER_TESTED_ON, SHOULD_WORK_QUERIES, SITE_SEARCH_SUMMARY, SITE_SEARCH_TESTS, TESTED_ON, type SiteSearchTest } from '@/lib/site-search.ts';
import type { SimRfq } from '@/lib/simulation/rfq.ts';

/** The site's own search form submits these two parameters. */
export const liveSearchUrl = (q: string) => `https://www.fieldinternational.com/?s=${encodeURIComponent(q).replace(/%20/g, '+')}&post_type=product`;

const test = (q: string): SiteSearchTest => SITE_SEARCH_TESTS.find((t) => t.query === q)!;

const FINDER_LABEL: Record<SiteSearchTest['finder'], { text: string; cls: string }> = {
  relevant: { text: 'relevant parts', cls: 'bg-strong-600/10 text-strong-600' },
  weak: { text: 'weak', cls: 'bg-caution-500/10 text-caution-600' },
  'wrong aircraft': { text: 'wrong aircraft', cls: 'bg-caution-500/10 text-caution-600' },
  nothing: { text: 'nothing', cls: 'bg-action-600/10 text-action-600' },
};

type Live = { count: number; strong: number; top: { partNumber: string; name: string; sourceUrl: string } | null } | 'failed';

/** Ask the finder, live, what it returns for each phrase the site fails on. One request at a time. */
function useLiveFinder(queries: readonly string[]) {
  const [live, setLive] = useState<Record<string, Live>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const query of queries) {
        try {
          const res = await fetch('/api/simulate/rfq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
          const data: SimRfq = await res.json();
          if (cancelled) return;
          const lines = data.lines ?? [];
          const top = lines[0];
          setLive((m) => ({
            ...m,
            [query]: {
              count: lines.length,
              strong: lines.filter((l) => l.matchClass === 'strong').length,
              top: top ? { partNumber: top.partNumber ?? '', name: top.name, sourceUrl: top.sourceUrl } : null,
            },
          }));
        } catch {
          if (!cancelled) setLive((m) => ({ ...m, [query]: 'failed' }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [queries]);
  return live;
}

/** A catalogue name without its own part number at the front, in sentence case. */
function tidyName(partNumber: string, name: string): string {
  const n = partNumber && name.startsWith(partNumber) ? name.slice(partNumber.length).trim() : name;
  return n.toLowerCase()
    .replace(/\b[a-z]*\d[a-z0-9-]*\b/g, (m) => m.toUpperCase()) // GENX-1B, CF6-80C2, JT9D
    .replace(/\(ce\)/g, '(CE)')
    .replace(/^\w/, (c) => c.toUpperCase());
}

function Count({ n }: { n: number }) {
  return n === 0
    ? <span className="font-semibold text-action-600">nothing</span>
    : <span className="font-semibold text-ink-900">{n.toLocaleString()} {n === 1 ? 'result' : 'results'}</span>;
}

/**
 * The same words on fieldinternational.com, measured on the live site. Six
 * searches that should plainly work, side by side with the finder answering
 * live, then every search we ran. Each query links to the real search so the
 * viewer can check it there and then.
 */
export function SiteSearchProof() {
  const [open, setOpen] = useState(false);
  const live = useLiveFinder(SHOULD_WORK_QUERIES);
  const s = SITE_SEARCH_SUMMARY;

  return (
    <div className="mt-10 sm:mt-14">
      <h2 className="enter font-display text-[29px] font-light leading-[1.08] tracking-[-0.02em] text-ink-950 sm:text-[44px]" style={{ animationDelay: '260ms' }}>
        Meanwhile, on <span className="text-signal-600">fieldinternational.com</span>
      </h2>
      <p className="enter mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-500 sm:mt-3 sm:text-[18px]" style={{ animationDelay: '300ms' }}>
        The site’s search box needs every word to appear in a product title. It doesn’t know which aircraft a tool is for,
        and a plural, a British spelling or a typo finds nothing at all.
      </p>

      <section className="enter mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink-100 sm:mt-6" style={{ animationDelay: '340ms' }}>
        {/* Searches that should plainly work, side by side: the site today against the finder, answering live. */}
        <div className="px-5 py-6 sm:px-8 sm:py-7">
          <h3 className="text-[16px] font-semibold tracking-tight text-ink-950">Six searches that should work</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-500">
            Phrases a customer would type for tooling Field sells. Every part on the right is on fieldinternational.com today, one click away.
            The site’s own search can’t get to any of them from these words. The finder always shows its six closest matches, so the question is what they are, not how many.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                  <th className="py-2 pr-4 font-semibold">A customer types</th>
                  <th className="py-2 pr-4 font-semibold">fieldinternational.com today</th>
                  <th className="py-2 font-semibold">This finder, right now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {SHOULD_WORK_QUERIES.map((q) => {
                  const t = test(q);
                  const r = live[q];
                  return (
                    <tr key={q}>
                      <td className="py-2.5 pr-4 align-top">
                        <a href={liveSearchUrl(q)} target="_blank" rel="noopener noreferrer nofollow" className="mono inline-flex items-center gap-1 font-medium text-ink-900 hover:text-signal-600">
                          {q} <ExternalLink className="h-3 w-3 text-ink-300" />
                        </a>
                      </td>
                      <td className="py-2.5 pr-4 align-top">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-action-600/[0.07] px-2 py-0.5 font-semibold text-action-600 ring-1 ring-inset ring-action-600/15">
                          <span className="h-1.5 w-1.5 rounded-full bg-action-600" /> {t.site === 0 ? 'Nothing' : `${t.site.toLocaleString()} results`}
                        </span>
                        {t.siteNote ? <span className="mt-1 block text-[11px] text-ink-400">{t.siteNote}</span> : null}
                      </td>
                      <td className="py-2.5 align-top">
                        {!r ? (
                          <span className="text-ink-400">Searching…</span>
                        ) : r === 'failed' ? (
                          <span className="text-ink-400">Couldn’t reach the finder</span>
                        ) : r.count === 0 || !r.top ? (
                          <span className="text-ink-500">Nothing</span>
                        ) : (
                          <>
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-semibold ring-1 ring-inset ${r.strong ? 'bg-strong-600/10 text-strong-600 ring-strong-600/15' : 'bg-caution-500/10 text-caution-600 ring-caution-500/20'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${r.strong ? 'bg-strong-600' : 'bg-caution-500'}`} />
                              {r.strong === r.count ? `${r.strong} direct matches` : r.strong ? `${r.strong} direct, ${r.count - r.strong} possible` : `${r.count} possible matches`}
                            </span>
                            <a href={r.top.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block text-[11.5px] text-ink-600 hover:text-signal-600">
                              e.g. <span className="mono text-ink-800">{r.top.partNumber}</span> {tidyName(r.top.partNumber, r.top.name)}
                            </a>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Every search we ran, with the site's count and a word on the finder. */}
        <div className="border-t border-ink-100 bg-ink-25 px-5 py-3 sm:px-8">
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-signal-600 hover:text-signal-800">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide the list' : `All ${s.total} searches we ran: ${s.nothing} found nothing`}
          </button>
          {open && (
            <div className="step-in mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
                    <th className="py-1.5 pr-3 font-semibold">Search</th>
                    <th className="py-1.5 pr-3 font-semibold">The site</th>
                    <th className="py-1.5 font-semibold">This finder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {SITE_SEARCH_TESTS.map((t) => (
                    <tr key={t.query}>
                      <td className="py-1.5 pr-3">
                        <a href={liveSearchUrl(t.query)} target="_blank" rel="noopener noreferrer nofollow" className="mono inline-flex items-center gap-1 text-ink-800 hover:text-signal-600">
                          {t.query} <ExternalLink className="h-3 w-3 text-ink-300" />
                        </a>
                      </td>
                      <td className="py-1.5 pr-3 text-ink-600"><Count n={t.site} />{t.siteNote ? <span className="text-ink-400"> · {t.siteNote}</span> : null}</td>
                      <td className="py-1.5"><span className={`rounded px-1.5 py-0.5 ${FINDER_LABEL[t.finder].cls}`}>{FINDER_LABEL[t.finder].text}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[10.5px] leading-relaxed text-ink-400">
                Measured on the live site on {TESTED_ON}, one search at a time, the way a visitor would. Our measurement, not Field’s analytics;
                these {s.total} are chosen queries, not a sample of real customer searches. The finder column was assessed on {FINDER_TESTED_ON}.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
