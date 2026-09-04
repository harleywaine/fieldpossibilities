import { computeRoi } from '@/lib/roi/model.ts';
import { RoiCalculator } from '@/components/roi/RoiCalculator.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';

export const dynamic = 'force-dynamic';

export default function RoiPage() {
  let roi = null;
  try { roi = computeRoi(); } catch { /* dataset not generated */ }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-light tracking-tight text-ink-950">Opportunity model</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Every figure here is computed from the assumptions below. Change an assumption and the
          whole model moves with it — nothing is hard-coded.
        </p>
      </header>

      <SyntheticNotice>
        The process volumes and durations are synthetic estimates created for demonstration. They
        are not measurements of Field’s operation. The purpose is to show the shape of the model
        and the sensitivity of the result, so that it can later be run against real figures.
      </SyntheticNotice>

      {roi ? (
        <RoiCalculator initial={roi} />
      ) : (
        <div className="card p-6">
          <h2 className="text-base font-medium">Synthetic dataset not generated</h2>
          <p className="mt-2 text-sm text-ink-600">
            Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run generate-demo-data</code>.
          </p>
        </div>
      )}
    </div>
  );
}
