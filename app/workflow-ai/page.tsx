import { levelBySlug } from '@/lib/levels.ts';
import { LevelHeader, ValuePanel } from '@/components/layout/LevelHeader.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { WorkflowConsole } from '@/components/workflow/WorkflowConsole.tsx';
import { demoAvailable } from '@/lib/db/demo.ts';

export const dynamic = 'force-dynamic';

export default function WorkflowAiPage() {
  const level = levelBySlug('workflow-ai')!;

  return (
    <div>
      <LevelHeader
        level={level}
        title="AI RFQ Automation"
        strap="From incoming enquiry to actionable work — automatically."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <SyntheticNotice>
          The enquiry, customer and account history are synthetic. The catalogue matching is real:
          every line item is matched against Field’s actual published catalogue, which is why some
          items genuinely fail to match.
        </SyntheticNotice>

        {!demoAvailable() ? (
          <div className="card p-6">
            <h2 className="text-base font-medium">Synthetic dataset not generated</h2>
            <p className="mt-2 text-sm text-ink-600">
              Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run generate-demo-data</code>.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-ink-600">
              At this level we are no longer asking the AI questions. The AI is doing part of the
              work: reading the enquiry, extracting the requirements, matching them against the
              catalogue, checking account history, and deciding what a human still needs to look at.
            </p>
            <WorkflowConsole />
            <div className="mt-8">
              <ValuePanel
                items={[
                  { label: 'Automated RFQ processing', detail: 'A 17-line enquiry is read, matched and packaged in well under a second.' },
                  { label: 'Reduced administration', detail: 'Catalogue lookup and history checking stop being manual work.' },
                  { label: 'Fewer manual handoffs', detail: 'The work package arrives with the exceptions already isolated for the right specialist.' },
                  { label: 'Increased capacity', detail: 'The same team handles more enquiries without the routine lookup burden.' },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
