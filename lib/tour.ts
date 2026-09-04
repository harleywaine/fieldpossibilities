/**
 * The guided tour — a pitch that presents itself.
 *
 * The recipient is a Managing Director with a link and no presenter. The tour
 * gives him one obvious action at every moment, a visible sense of how long
 * this costs him, and a story that escalates: proof → hands-on → trust →
 * automation → money → the way in. The deep platform remains underneath for
 * the people he forwards it to.
 */

export interface TourChapter {
  n: number;
  slug: string;
  href: string;
  /** Waypoint label on the progress rail. */
  label: string;
  /** Browser-tab title suffix. */
  title: string;
}

export const TOUR: TourChapter[] = [
  { n: 1, slug: 'watch',      href: '/tour/watch',      label: 'Watch',      title: 'Watch it work' },
  { n: 2, slug: 'try',        href: '/tour/try',        label: 'Try',        title: 'Try it yourself' },
  { n: 3, slug: 'understand', href: '/tour/understand', label: 'Understand', title: 'Pointed inwards' },
  { n: 4, slug: 'do',         href: '/tour/do',         label: 'Do',         title: 'From answering to working' },
  { n: 5, slug: 'value',      href: '/tour/value',      label: 'Value',      title: 'What it is worth' },
  { n: 6, slug: 'next',       href: '/tour/next',       label: 'Next',       title: 'The way in' },
];

export const chapterBySlug = (slug: string) => TOUR.find((c) => c.slug === slug);

/** The one query the whole story hangs off. Runs for real, against real data. */
export const GOLDEN_QUERY =
  "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine " +
  'thrust reverser maintenance. We need delivery within 10 weeks.';

export const GOLDEN_ENQUIRY =
  "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx " +
  'thrust reverser tooling. Tell me everything I need to know before I respond.';
