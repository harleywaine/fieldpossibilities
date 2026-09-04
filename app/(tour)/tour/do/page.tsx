import type { Metadata } from 'next';
import { TourShell, ChapterHead, WatchFor, Beat } from '@/components/tour/TourShell.tsx';
import { WorkflowConsole } from '@/components/workflow/WorkflowConsole.tsx';
import { demoAvailable } from '@/lib/db/demo.ts';

export const metadata: Metadata = { title: 'From answering to working — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function DoChapter() {
  return (
    <TourShell chapter="do" width="wide" continueLabel="Continue — what it’s worth">
      <ChapterHead
        n={4}
        label="Do"
        title="From answering questions to doing work."
        lede={
          <>
            So far you’ve asked and it has answered. This chapter is different: an RFQ arrives with
            seventeen line items, and the system processes it — reads it, matches every line
            against your real catalogue, checks the account’s history, and decides what still
            needs a person.
          </>
        }
      />

      <WatchFor
        points={[
          'The catalogue matching is real — every line item resolves (or fails to resolve) against your actual published data.',
          'It will not resolve everything. Three items get routed to your people — deliberately.',
          'Nothing is priced, promised or sent. Four human gates stand between this and your customer.',
        ]}
      />

      {demoAvailable() ? (
        <WorkflowConsole
          beat={
            <Beat>
              Fourteen of seventeen lines handled in under a second; three routed to your
              specialists with the reason attached. That ratio is the business case — the routine
              work disappears, and human judgement is spent only where it is genuinely needed.
            </Beat>
          }
        />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}
    </TourShell>
  );
}
