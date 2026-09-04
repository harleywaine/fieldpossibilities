import type { Metadata } from 'next';
import { TourShell, ChapterHead, Beat } from '@/components/tour/TourShell.tsx';
import { RoiCalculator } from '@/components/roi/RoiCalculator.tsx';
import { computeRoi } from '@/lib/roi/model.ts';

export const metadata: Metadata = { title: 'What it is worth — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function ValueChapter() {
  let roi = null;
  try { roi = computeRoi(); } catch { /* dataset not generated */ }

  return (
    <TourShell chapter="value" width="wide" continueLabel="Continue — the way in">
      <ChapterHead
        n={5}
        label="Value"
        title="What is this worth?"
        lede={
          <>
            An honest model, not a big number. Every figure below is computed from stated
            assumptions — move any slider and the whole model moves with it. The volumes are
            synthetic; the arithmetic is the part you keep. Payback is calculated against cash,
            not the headline, because you can’t pay an invoice with capacity.
          </>
        }
      />

      {roi ? (
        <RoiCalculator initial={roi} compact />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}

      <Beat>
        When this model is re-run on Field’s real volumes and loaded costs, the number will be
        different — that is the point of building it as a model rather than a slide. The shape of
        the opportunity, though, is already visible: the biggest wins sit in the routine work your
        most capable people currently do by hand.
      </Beat>
    </TourShell>
  );
}
