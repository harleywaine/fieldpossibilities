'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { FINDER_TESTED_ON, SHOULD_WORK_QUERIES, SITE_SEARCH_SUMMARY, SITE_SEARCH_TESTS, TESTED_ON, nearestTest, type SiteSearchTest } from '@/lib/site-search.ts';
import type { SimRfq } from '@/lib/simulation/rfq.ts';

/** The site's own search form submits these two parameters. */
export const liveSearchUrl = (q: string) => `https://www.fieldinternational.com/?s=${encodeURIComponent(q).replace(/%20/g, '+')}&post_type=product`;

/** The message the site shows when a search finds no products, word for word. */
const SITE_EMPTY = "It seems we can't find what you're looking for.";

const test = (q: string): SiteSearchTest => SITE_SEARCH_TESTS.find((t) => t.query === q)!;

/** Same tool, different word: pairs where one spelling finds hundreds and the other finds nothing. */
const PAIRS: Array<[string, string]> = [['slings', 'sling'], ['stabiliser', 'stabilizer'], ['777 landing gear', 'landing gear']];

const FINDER_LABEL: Record<SiteSearchTest['finder'], { text: string; cls: string }> = {
  relevant: { text: 'relevant parts', cls: 'bg-strong-600/10 text-strong-600' },
  weak: { text: 'weak', cls: 'bg-caution-500/10 text-caution-600' },
  'wrong aircraft': { text: 'wrong aircraft', cls: 'bg-caution-500/10 text-caution-600' },
  nothing: { text: 'nothing', cls: 'bg-action-600/10 text-action-600' },
};

type Live = { count: number; top: { partNumber: string; name: string; sourceUrl: string } | null } | 'failed';

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
          const top = data.lines?.[0];
          setLive((m) => ({ ...m, [query]: { count: data.lines?.length ?? 0, top: top ? { partNumber: top.partNumber ?? '', name: top.name, sourceUrl: top.sourceUrl } : null } }));
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
  const n = name.startsWith(partNumber) ? name.slice(partNumber.length).trim() : name;
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
 * The same words on fieldinternational.com, measured on the live site. Every
 * query links to the real search so the viewer can check it there and then.
 */
export function SiteSearchProof({ request }: { request: string }) {
  const [open, setOpen] = useState(false);
  const live = useLiveFinder(SHOULD_WORK_QUERIES);
  const near = nearestTest(request) ?? test('777 landing gear');
  const s = SITE_SEARCH_SUMMARY;

  const headline = near.site === 0
    ? <>Search the site for <span className="font-medium text-ink-950">“{near.query}”</span> and it finds <span className="font-medium text-action-600">nothing</span>.</>
    : near.site > 100
      ? <>Search the site for <span className="font-medium text-ink-950">“{near.query}”</span> and it hands back <span className="font-medium text-ink-950">{near.site.toLocaleString()} results</span> to read through.</>
      : <>Search the site for <span className="font-medium text-ink-950">“{near.query}”</span> and it finds <span className="font-medium text-ink-950">{near.site.toLocaleString()}</span>.</>;

  return (
    <div className="mt-10 sm:mt-14">
      <h2 className="enter font-display text-[29px] font-light leading-[1.08] tracking-[-0.02em] text-ink-950 sm:text-[44px]" style={{ animationDelay: '260ms' }}>
        Meanwhile, on <span className="text-signal-600">fieldinternational.com</span>
      </h2>
      <p className="enter mt-2.5 max-w-2xl text-[15px] leading-relaxed text-ink-500 sm:mt-3 sm:text-[18px]" style={{ animationDelay: '300ms' }}>
        The same words, typed into the site’s own search box.
      </p>
    <section className="enter mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink-100 sm:mt-6" style={{ animationDelay: '340ms' }}>
      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <h3 className="font-display text-[22px] font-light leading-[1.15] tracking-[-0.01em] text-ink-700 sm:text-[27px]">{headline}</h3>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink-500 sm:text-[15px]">
            The site’s search box needs every word to appear in a product title. It doesn’t know which aircraft a tool is for,
            and a plural, a British spelling or a typo finds nothing at all.
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: `${s.nothing} of ${s.total}`, t: 'realistic searches found nothing', cls: 'text-action-600' },
              { n: String(s.flood), t: 'returned over a hundred results, unfiltered by aircraft', cls: 'text-ink-900' },
              { n: `${s.finderRelevant} of ${s.total}`, t: 'found relevant parts in this finder', cls: 'text-strong-600' },
            ].map((x) => (
              <div key={x.t} className="rounded-xl bg-ink-25 p-4">
                <dt className={`font-display text-[30px] font-light leading-none tracking-tight ${x.cls}`}>{x.n}</dt>
                <dd className="mt-1.5 text-[12px] leading-snug text-ink-500">{x.t}</dd>
              </div>
            ))}
          </dl>

        </div>

        {/* What the site itself shows for the nearest tested search, with the real page one click away. */}
        <div className="overflow-hidden rounded-xl ring-1 ring-ink-200 shadow-[0_16px_40px_-20px_rgba(4,24,47,0.35)]">
          <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-25 px-3 py-2">
            <span className="flex gap-1"><i className="h-2 w-2 rounded-full bg-ink-200" /><i className="h-2 w-2 rounded-full bg-ink-200" /><i className="h-2 w-2 rounded-full bg-ink-200" /></span>
            <span className="mono min-w-0 flex-1 truncate rounded bg-white px-2 py-0.5 text-[10.5px] text-ink-500 ring-1 ring-ink-100">fieldinternational.com/?s={near.query.replace(/ /g, '+')}</span>
          </div>
          <div className="bg-white p-4">
            <div className="flex items-center gap-2 rounded border border-ink-200 px-3 py-2 text-[13px] text-ink-800">
              <span className="min-w-0 flex-1 truncate">{near.query}</span>
              <Search className="h-4 w-4 shrink-0 text-ink-400" />
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-ink-400">Parts search</p>
            {near.site === 0 ? (
              <p className="mt-2 text-[15px] leading-snug text-ink-800">{SITE_EMPTY}</p>
            ) : (
              <p className="mt-2 text-[13px] text-ink-700">Showing 1–10 of {near.site.toLocaleString()} results{near.siteNote ? <span className="block text-ink-400">{near.siteNote}</span> : null}</p>
            )}
            <a
              href={liveSearchUrl(near.query)} target="_blank" rel="noopener noreferrer nofollow"
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-[3px] bg-signal-600 px-3.5 text-[12.5px] font-bold text-white transition-colors hover:bg-signal-500"
            >
              Run this search on the live site <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-3 text-[10.5px] leading-relaxed text-ink-400">As the site returned it on {TESTED_ON}. Opens fieldinternational.com in a new tab.</p>
          </div>
        </div>
      </div>

      {/* Searches that should plainly work, side by side: the site today against the finder, answering live. */}
      <div className="border-t border-ink-100 px-5 py-6 sm:px-8 sm:py-7">
        <h3 className="text-[16px] font-semibold tracking-tight text-ink-950">Six searches that should work</h3>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-500">
          Phrases a customer would type for tooling Field sells. Every part on the right is on fieldinternational.com today, one click away. The site’s own search can’t get to any of them from these words.
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
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-strong-600/10 px-2 py-0.5 font-semibold text-strong-600 ring-1 ring-inset ring-strong-600/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-strong-600" /> {r.count} parts
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

        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Same tool, different word</p>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {PAIRS.map(([a, b]) => (
            <li key={a} className="rounded-xl ring-1 ring-ink-100">
              {[test(a), test(b)].map((t) => (
                <a
                  key={t.query} href={liveSearchUrl(t.query)} target="_blank" rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] first:border-b first:border-ink-100 hover:bg-ink-25"
                >
                  <span className="mono text-ink-800">{t.query}</span>
                  <Count n={t.site} />
                </a>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-ink-100 bg-ink-25 px-5 py-3 sm:px-8">
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-signal-600 hover:text-signal-800">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Hide the list' : `All ${s.total} searches, with links`}
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
