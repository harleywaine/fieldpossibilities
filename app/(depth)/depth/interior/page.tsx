import type { Metadata } from 'next';
import { DepthShell, WatchFor, Beat } from '@/components/depth/DepthShell.tsx';
import { KnowledgeConsole } from '@/components/knowledge/KnowledgeConsole.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { GOLDEN_ENQUIRY } from '@/lib/depth.ts';
import { demoAvailable } from '@/lib/db/demo.ts';

export const metadata: Metadata = { title: '−01 The interior — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function InteriorStratum() {
  return (
    <DepthShell stratum="interior" width="narrow">
      <SyntheticNotice>
        The surface could be built without asking, because your catalogue is public. Your internal
        knowledge isn’t — so this layer runs on a fabricated business: 173 synthetic documents,
        clearly labelled, modelling how Field’s records might look. The intelligence reading them
        is the real one.
      </SyntheticNotice>

      <WatchFor
        points={[
          'It reads a dozen documents in one pass and assembles what a colleague would take a morning to find.',
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
              The interesting part isn’t the answer — it’s the working. Every field cites its
              documents, the disagreement was surfaced instead of resolved silently, and the one
              thing it wouldn’t say is the one thing the records genuinely don’t establish.
            </Beat>
          }
        />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}
    </DepthShell>
  );
}
