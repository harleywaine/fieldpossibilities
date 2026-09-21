import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Journey } from '@/components/journey/Journey.tsx';
import { loadMetrics } from '@/lib/roi/model.ts';
import { FALLBACK_METRICS, type StepMetric } from '@/lib/journey.ts';
import { listCustomers, type SimCustomer } from '@/lib/simulation/rfq.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'Play the customer. Follow your own enquiry through Field, deciding what a person would decide.',
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

  let customers: SimCustomer[] = [];
  try { customers = listCustomers(); } catch { /* dataset not generated */ }
  if (!customers.length) customers = [{ id: 'CUST-001', name: 'Singapore Aero MRO', country: 'Singapore', owner: null }];

  return (
    <Suspense>
      <Journey metrics={metrics} customers={customers} />
    </Suspense>
  );
}
