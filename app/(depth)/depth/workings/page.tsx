import type { Metadata } from 'next';
import { DepthShell, WatchFor, Beat } from '@/components/depth/DepthShell.tsx';
import { WorkflowConsole } from '@/components/workflow/WorkflowConsole.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { demoAvailable } from '@/lib/db/demo.ts';

export const metadata: Metadata = { title: '−02 The workings — Field AI Opportunity Lab' };
export const dynamic = 'force-dynamic';

export default function WorkingsStratum() {
  return (
    <DepthShell stratum="workings">
      <SyntheticNotice>
        The enquiry, the customer and the account history are synthetic. The catalogue matching is
        not — every line item resolves, or fails to resolve, against Field’s actual published
        data. That is why some items genuinely don’t match.
      </SyntheticNotice>

      <WatchFor
        points={[
          'Up to here you asked and it answered. This layer is different: the work happens by itself.',
          'It will not resolve everything. Three items get routed to people — deliberately.',
          'Nothing is priced, promised or sent. Four human gates stand between this and a customer.',
        ]}
      />

      {demoAvailable() ? (
        <WorkflowConsole
          beat={
            <Beat>
              Fourteen of seventeen lines resolved in under a second; three routed to specialists
              with the reason attached. The machine does the reading. The judgement stays human.
            </Beat>
          }
        />
      ) : (
        <p className="text-sm text-ink-500">Synthetic dataset not generated — run npm run generate-demo-data.</p>
      )}
    </DepthShell>
  );
}
