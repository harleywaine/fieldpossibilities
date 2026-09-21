import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Journey } from '@/components/journey/Journey.tsx';
import { loadMetrics } from '@/lib/roi/model.ts';
import { FALLBACK_METRICS, type StepMetric } from '@/lib/journey.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'One enquiry, followed from the first question to the finished tool.',
};

/** The front door: one enquiry, told a screen at a time. */
export default function JourneyPage() {
  // Times come from the same metrics table the value model uses.
  let metrics: Record<string, StepMetric> = FALLBACK_METRICS;
  try {
    const rows = loadMetrics() as any[];
    if (rows.length) {
      metrics = Object.fromEntries(rows.map((m) => [
        String(m.process),
        { before: Number(m.current_minutes), after: Number(m.ai_assisted_minutes), volume: Number(m.annual_volume) },
      ]));
    }
  } catch { /* synthetic dataset not generated — fall back */ }

  return (
    <Suspense>
      <Journey metrics={metrics} />
    </Suspense>
  );
}
