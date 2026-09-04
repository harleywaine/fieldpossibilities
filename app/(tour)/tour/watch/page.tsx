import type { Metadata } from 'next';
import { TourShell, ChapterHead, Beat } from '@/components/tour/TourShell.tsx';
import { AutoDemo } from '@/components/tour/AutoDemo.tsx';

export const metadata: Metadata = { title: 'Watch it work — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function WatchChapter() {
  return (
    <TourShell chapter="watch" continueLabel="Continue — your turn">
      <ChapterHead
        n={1}
        label="Watch"
        title="Ask the catalogue a question."
        lede={
          <>
            A maintenance engineer doesn’t think in part numbers. They think like this — watch what
            happens when the question is asked the way a customer would actually ask it.
          </>
        }
      />
      <AutoDemo
        beat={
          <Beat>
            Those are your products. Real part numbers, retrieved from a snapshot of your published
            catalogue in well under a second — each with the evidence for the match, and an honest
            note about what the catalogue doesn’t establish. Nothing was staged: the same request
            just ran against the data, live.
          </Beat>
        }
      />
    </TourShell>
  );
}
