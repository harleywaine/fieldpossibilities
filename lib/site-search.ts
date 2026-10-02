/**
 * What fieldinternational.com's own search returns today, measured.
 *
 * Twenty-seven searches a customer might realistically type, run on the live
 * site on 27 September 2026 and again on 2 October 2026 with identical
 * results, one at a time, the way a visitor would. The site
 * runs WordPress's default keyword search: every word must appear in the
 * product title or description, with no stemming, no spelling tolerance and
 * no knowledge of which aircraft a tool is for (that lives in a filter the
 * search box can't see). The finder's results are from the same day.
 *
 * These are our measurements of the public site, not Field's own analytics,
 * and 27 chosen queries are not a sample of real customer searches.
 */

export interface SiteSearchTest {
  query: string;
  /** Result count on the live site; 0 means "It seems we can't find what you're looking for." */
  site: number;
  /** A word on what came back, where the number alone misleads. */
  siteNote?: string;
  /** What the finder returned for the same words. */
  finder: 'relevant' | 'weak' | 'wrong aircraft' | 'nothing';
}

export const TESTED_ON = '2 October 2026';
/** The finder column was assessed when the list was first run. */
export const FINDER_TESTED_ON = '27 September 2026';

export const SITE_SEARCH_TESTS: SiteSearchTest[] = [
  { query: '777 landing gear', site: 0, finder: 'relevant' },
  { query: '787 thrust reverser', site: 0, finder: 'relevant' },
  { query: 'axle jack 747', site: 0, finder: 'relevant' },
  { query: '747 heavy check', site: 0, finder: 'relevant' },
  { query: '737 MAX', site: 0, finder: 'weak' },
  { query: '787-9', site: 0, finder: 'weak' },
  { query: '777-300ER', site: 0, finder: 'nothing' },
  { query: 'A320 fan cowl', site: 0, finder: 'wrong aircraft' },
  { query: 'slings', site: 0, siteNote: '"sling" finds 548', finder: 'relevant' },
  { query: 'stabiliser', site: 0, siteNote: '"stabilizer" finds 217', finder: 'relevant' },
  { query: 'tyre inflation', site: 0, siteNote: '"tire inflation" finds 7', finder: 'relevant' },
  { query: 'dynomometer', site: 0, siteNote: 'a typo; "dynamometer" finds 37', finder: 'nothing' },
  { query: 'landing gear', site: 847, siteNote: 'A380 trolleys first, 85 pages', finder: 'relevant' },
  { query: 'sling', site: 548, finder: 'relevant' },
  { query: 'stabilizer', site: 217, finder: 'relevant' },
  { query: 'thrust reverser', site: 214, finder: 'relevant' },
  { query: 'MLG', site: 125, finder: 'relevant' },
  { query: 'engine sling', site: 106, finder: 'relevant' },
  { query: 'bootstrap', site: 57, finder: 'relevant' },
  { query: 'dynamometer', site: 37, siteNote: 'the Dillon range', finder: 'weak' },
  { query: 'GEnx', site: 32, finder: 'relevant' },
  { query: 'LEAP-1B', site: 23, finder: 'relevant' },
  { query: 'tire inflation', site: 7, finder: 'relevant' },
  { query: 'GE90 fan cowl', site: 3, finder: 'relevant' },
  { query: 'wheel change', site: 3, finder: 'relevant' },
  { query: 'towbar 737', site: 2, finder: 'relevant' },
  { query: 'J71015-28', site: 1, siteNote: 'exact part numbers go straight to the page', finder: 'relevant' },
];

export const SITE_SEARCH_SUMMARY = (() => {
  const t = SITE_SEARCH_TESTS;
  return {
    total: t.length,
    nothing: t.filter((x) => x.site === 0).length,
    flood: t.filter((x) => x.site > 100).length,
    usable: t.filter((x) => x.site > 0 && x.site <= 100).length,
    finderRelevant: t.filter((x) => x.finder === 'relevant').length,
  };
})();

/** The nearest tested query to what the viewer typed, if any of its words match a test exactly. */
export function nearestTest(request: string): SiteSearchTest | null {
  const words = new Set(request.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []);
  let best: { test: SiteSearchTest; score: number } | null = null;
  for (const test of SITE_SEARCH_TESTS) {
    const q = test.query.toLowerCase().split(/\s+/);
    const hits = q.filter((w) => words.has(w)).length;
    const score = hits === q.length ? hits + 1 : hits;
    if (hits && (!best || score > best.score)) best = { test, score };
  }
  return best?.test ?? null;
}
