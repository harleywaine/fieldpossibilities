import { levelBySlug } from '@/lib/levels.ts';
import { LevelHeader, ValuePanel } from '@/components/layout/LevelHeader.tsx';
import { SyntheticNotice } from '@/components/layout/DataBadge.tsx';
import { KnowledgeConsole } from '@/components/knowledge/KnowledgeConsole.tsx';
import { demoAvailable, demoStats } from '@/lib/db/demo.ts';

export const dynamic = 'force-dynamic';

export default function KnowledgeAiPage() {
  const level = levelBySlug('knowledge-ai')!;
  const ready = demoAvailable();
  const stats = ready ? safeStats() : null;

  return (
    <div>
      <LevelHeader
        level={level}
        title="Field Intelligence"
        strap="Your company’s knowledge, ready when you need it."
      />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <SyntheticNotice>
          This demonstration searches {stats ? `${stats.documents} synthetic internal documents` : 'a synthetic internal document set'} —
          RFQs, quotes, emails, technical notes, supplier correspondence and meeting notes —
          created to model how an AI knowledge layer could work inside Field. These are not real
          Field records. Catalogue items shown alongside them are real public data.
        </SyntheticNotice>

        {!ready ? (
          <div className="card p-6">
            <h2 className="text-base font-medium">Synthetic dataset not generated</h2>
            <p className="mt-2 text-sm text-ink-600">
              Run <code className="mono rounded bg-ink-100 px-1.5 py-0.5 text-xs">npm run generate-demo-data</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm leading-relaxed text-ink-600">
                A technical sales manager receives an enquiry. Everything the business already knows
                about that customer sits across a dozen documents that nobody has time to read.
                This is what it looks like when the AI reads them instead.
              </p>
            </div>
            <KnowledgeConsole />
            <div className="mt-8">
              <ValuePanel
                items={[
                  { label: 'Reduced research time', detail: 'Cross-document context assembled in under a second, rather than a morning of searching shared drives.' },
                  { label: 'Faster onboarding', detail: 'A new starter can reach the same context as the account owner without knowing where anything is filed.' },
                  { label: 'Knowledge retention', detail: 'Account history survives a person leaving, because it is retrieved rather than remembered.' },
                  { label: 'Faster customer response', detail: 'A grounded draft and a quote brief are prepared before the first human touches the enquiry.' },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function safeStats() {
  try { return demoStats(); } catch { return null; }
}
