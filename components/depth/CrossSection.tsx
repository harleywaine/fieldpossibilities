import Link from 'next/link';
import { STRATA } from '@/lib/depth.ts';
import { DataBadge } from '@/components/layout/DataBadge.tsx';

/**
 * The section drawing: every layer of the machine visible at once, darkening
 * with depth. A map to wander, not a track to follow — each band is a door.
 */
const BAND_STYLE: Array<{ bg: string; light: boolean }> = [
  { bg: '#f3f6fb', light: false },
  { bg: '#123561', light: true },
  { bg: '#0a2445', light: true },
  { bg: '#04152b', light: true },
];

export function CrossSection() {
  return (
    <div className="overflow-hidden rounded-[2px] border border-ink-200">
      <ol>
        {STRATA.map((s, i) => {
          const { bg, light } = BAND_STYLE[i];
          const here = s.slug === 'surface';
          const inner = (
            <div
              className="group relative flex items-center gap-5 px-5 py-6 transition-opacity sm:px-7"
              style={{ background: bg }}
            >
              {/* Depth mark */}
              <span
                className={`mono w-14 shrink-0 text-[24px] font-medium leading-none ${
                  light ? 'text-white/25 group-hover:text-white/50' : 'text-ink-200 group-hover:text-ink-300'
                } transition-colors`}
              >
                {s.mark}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`text-[15px] font-medium ${light ? 'text-white' : 'text-ink-900'}`}>
                    {s.name}
                  </span>
                  {here ? (
                    <span className="mono rounded-[2px] border border-ink-300 px-1.5 py-[2px] text-[9px] tracking-[0.12em] text-ink-500">
                      YOU ARE HERE
                    </span>
                  ) : (
                    <DataBadge kind={s.dataKind} />
                  )}
                </div>
                <p className={`mt-1 max-w-xl text-[12.5px] leading-relaxed ${light ? 'text-signal-100/75' : 'text-ink-500'}`}>
                  {s.line}
                </p>
              </div>

              {!here && (
                <span
                  aria-hidden="true"
                  className={`shrink-0 text-[13px] transition-transform group-hover:translate-x-1 ${
                    light ? 'text-signal-300' : 'text-ink-400'
                  }`}
                >
                  Enter →
                </span>
              )}

              {/* Hairline between strata, like a section rule. */}
              {i < STRATA.length - 1 && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
              )}
            </div>
          );

          return (
            <li key={s.slug}>
              {here ? inner : <Link href={s.href} className="block">{inner}</Link>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
