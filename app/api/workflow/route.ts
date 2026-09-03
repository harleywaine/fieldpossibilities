import { NextResponse } from 'next/server';
import { processRfq } from '@/lib/workflow/rfq.ts';
import { recordAudit } from '@/lib/audit.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { reference } = await request.json();
    const ref = typeof reference === 'string' && reference.trim() ? reference.trim() : 'RFQ-10482';
    const pkg = processRfq(ref);

    recordAudit({
      actor: 'demo-user', action: 'workflow:process-rfq', query: ref,
      retrievedSources: pkg.lines.filter((l) => l.product).map((l) => l.product!.id),
      model: 'deterministic-matcher',
      outputSummary: `${pkg.counts.matched} matched, ${pkg.counts.review} review, ${pkg.counts.unmatched} unmatched`,
      approvalRequired: true, approvalStatus: 'pending',
    });

    // Products are stripped down for transport; the page only needs identity.
    return NextResponse.json({
      ...pkg,
      lines: pkg.lines.map((l) => ({
        ...l,
        product: l.product ? {
          id: l.product.id, partNumber: l.product.partNumber, name: l.product.name,
          aircraftModel: l.product.aircraftModel, engine: l.product.engine,
          maintenanceCategory: l.product.maintenanceCategory,
          leadTimeDays: l.product.leadTimeDays, sourceUrl: l.product.sourceUrl,
        } : null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Workflow failed.' },
      { status: 500 },
    );
  }
}
