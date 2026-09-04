import type { Metadata } from 'next';
import { TourShell, ChapterHead, WatchFor, Beat } from '@/components/tour/TourShell.tsx';
import { KnowledgeConsole } from '@/components/knowledge/KnowledgeConsole.tsx';
import { GOLDEN_ENQUIRY } from '@/lib/tour.ts';
import { demoAvailable } from '@/lib/db/demo.ts';

export const metadata: Metadata = { title: 'Pointed inwards — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function UnderstandChapter() {
  return (
    <TourShell chapter="understand" continueLabel="Continue — let it do the work">
      <ChapterHead
        n={3}
        label="Understand"
        title="The same intelligence, pointed inwards."
        lede={
          <>
            Your catalogue is public, which is why we could build the first two chapters without
            asking. Your internal knowledge isn’t — so for this chapter we fabricated a business:{' '}
            <span className="text-ink-800">173 synthetic documents</span> — RFQs, quotes, emails,
            technical notes, supplier correspondence — modelling how Field’s records might look.
            Everything below is clearly labelled as such. The intelligence layer, though, is the
            real one.
          </>
        }
      />

      <WatchFor
        points={[
          'It reads a dozen documents in one pass and assembles the brief a colleague would take a morning to build.',
          'Two of those documents disagree about a supplier lead time. Watch what it does about that.',
          'Asked about a specific aircraft variant, it refuses to claim what the records don’t establish.',
        ]}
      />

      {demoAvailable() ? (
        <KnowledgeConsole
          preset={GOLDEN_ENQUIRY}
          tourIntro
          beat={
            <Beat>
              The point isn’t that it found the answer — it’s that it showed its working. Every
              field cites its documents, the disagreement was surfaced instead of resolved
              silently, and the one thing it wouldn’t say is the one thing the records genuinely
              don’t establish. That is what makes an AI system safe to put in front of your people.
            </Beat>
          }
        />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}
    </TourShell>
  );
}
