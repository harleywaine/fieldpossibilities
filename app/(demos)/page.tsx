import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Journey } from '@/components/journey/Journey.tsx';
import { loadMetrics } from '@/lib/roi/model.ts';
import { FALLBACK_METRICS, type StepMetric } from '@/lib/journey.ts';
import { catalogueStats } from '@/lib/db/client.ts';
import { listAccounts, listInbox, listSuppliers, type CrmAccount, type CrmInboxItem, type CrmSupplier } from '@/lib/simulation/crm.ts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Field AI Opportunity Lab',
  description: 'Play Field’s customer, then Field: follow your own enquiry from the website through the CRM, deciding what a person would decide.',
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

  // Without the synthetic dataset every company is a new lead and the inbox is empty.
  let accounts: CrmAccount[] = [];
  let inbox: CrmInboxItem[] = [];
  let suppliers: CrmSupplier[] = [];
  try { accounts = listAccounts(); inbox = listInbox(); suppliers = listSuppliers(); } catch { /* dataset not generated */ }

  let catalogue: { products: number; withImages: number; withLeadTime: number } | null = null;
  try {
    const c = catalogueStats();
    catalogue = { products: c.products, withImages: c.withImages, withLeadTime: c.withLeadTime };
  } catch { /* catalogue not built */ }

  return (
    <Suspense>
      <Journey metrics={metrics} accounts={accounts} inbox={inbox} suppliers={suppliers} catalogue={catalogue} />
    </Suspense>
  );
}
