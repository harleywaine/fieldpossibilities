import type { Metadata } from 'next';
import { TourShell, ChapterHead, Beat } from '@/components/tour/TourShell.tsx';
import { TourSearch } from '@/components/tour/TourSearch.tsx';

export const metadata: Metadata = { title: 'Try it yourself — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function TryChapter() {
  return (
    <TourShell chapter="try" continueLabel="Continue — point it inwards">
      <ChapterHead
        n={2}
        label="Try"
        title="Your catalogue. Any question."
        lede={
          <>
            Now it’s in your hands. Ask anything — an aircraft, a maintenance task, even a part
            number. Every result carries a link to the live page on{' '}
            <span className="text-ink-800">fieldinternational.com</span>, so you can verify
            anything against your own website.
          </>
        }
      />
      <TourSearch
        beat={
          <Beat>
            Notice what you never had to know: the part numbering, the catalogue taxonomy, the
            product naming. You described the problem; the system speaks Field. And when the
            catalogue can’t support an answer, it says so instead of improvising one.
          </Beat>
        }
      />
    </TourShell>
  );
}
