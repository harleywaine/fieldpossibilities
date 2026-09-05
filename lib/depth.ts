/**
 * The cutaway — the site as a section drawing of one machine.
 *
 * Depth is the axis, and depth means complexity: the surface is the simple
 * thing (a search box on public data, live today); each stratum below does
 * more and needs more. It is a map, not a track — every layer is visible at
 * once and you can enter anywhere. Nothing continues; you descend.
 */

export interface Stratum {
  slug: string;
  href: string;
  /** Engineering-style depth mark. */
  mark: string;
  name: string;
  line: string;
  dataKind: 'real' | 'synthetic' | 'mixed';
}

export const STRATA: Stratum[] = [
  {
    slug: 'surface', href: '/', mark: '00', name: 'The surface',
    line: 'A question in plain English, against the published catalogue. Live now.',
    dataKind: 'real',
  },
  {
    slug: 'interior', href: '/depth/interior', mark: '−01', name: 'The interior',
    line: 'The same intelligence pointed at a company’s own records — enquiries, quotes, correspondence.',
    dataKind: 'synthetic',
  },
  {
    slug: 'workings', href: '/depth/workings', mark: '−02', name: 'The workings',
    line: 'An RFQ arrives and is read, matched and packaged. The judgement calls stay human.',
    dataKind: 'mixed',
  },
  {
    slug: 'core', href: '/depth/core', mark: '−03', name: 'The core',
    line: 'Every layer feeding one picture: where the time goes, and what to build first.',
    dataKind: 'synthetic',
  },
];

export const stratumBySlug = (slug: string) => STRATA.find((s) => s.slug === slug);

/** Background of each stratum's header band — the section darkens with depth. */
export const DEPTH_BANDS: Record<string, string> = {
  interior: 'linear-gradient(135deg, #0d2f56 0%, #0a2545 100%)',
  workings: 'linear-gradient(135deg, #082038 0%, #061a2e 100%)',
  core:     'linear-gradient(135deg, #041526 0%, #030f1c 100%)',
};

/** The one query the surface demonstrates by itself. Runs for real. */
export const GOLDEN_QUERY =
  "We're maintaining Boeing 787-9 aircraft and need tooling for GEnx engine " +
  'thrust reverser maintenance. We need delivery within 10 weeks.';

export const GOLDEN_ENQUIRY =
  "I've just received an enquiry from Singapore Aero MRO for Boeing 787 GEnx " +
  'thrust reverser tooling. Tell me everything I need to know before I respond.';
