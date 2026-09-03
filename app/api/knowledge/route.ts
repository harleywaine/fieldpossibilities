import { NextResponse } from 'next/server';
import { buildEnquiryBrief } from '@/lib/knowledge/brief.ts';
import { composeCustomerResponse, composeQuoteBrief } from '@/lib/knowledge/compose.ts';
import { retrieve } from '@/lib/ai/retrieval.ts';
import { recordAudit } from '@/lib/audit.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { question, action } = await request.json();
    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    }

    const brief = buildEnquiryBrief(question);

    // Catalogue matches come from the REAL catalogue, using the requirement the
    // knowledge layer derived from synthetic internal records.
    const catalogueQuery = [brief.requirement, brief.customerName].filter(Boolean).join(' ');
    const catalogue = brief.requirement ? retrieve(catalogueQuery, { limit: 6 }) : null;
    const matches = (catalogue?.results ?? []).map((r) => ({
      id: r.product.id, partNumber: r.product.partNumber, name: r.product.name,
      leadTimeDays: r.product.leadTimeDays, matchClass: r.matchClass,
      sourceUrl: r.product.sourceUrl,
    }));

    let generated: { kind: string; text: string; sections?: unknown } | null = null;
    if (action === 'respond') {
      generated = { kind: 'response', text: composeCustomerResponse(brief) };
    } else if (action === 'quote-brief') {
      const qb = composeQuoteBrief(brief, matches);
      generated = { kind: 'quote-brief', text: qb.text, sections: qb.sections };
    }

    recordAudit({
      actor: 'demo-user', action: action ? `knowledge:${action}` : 'knowledge:brief',
      query: question,
      retrievedSources: brief.retrieval.documents.map((d) => d.document_id),
      model: 'local-grounded',
      outputSummary: `${brief.fields.length} fields, ${brief.retrieval.documents.length} sources`,
      approvalRequired: action === 'respond',
      approvalStatus: action === 'respond' ? 'pending' : 'not-required',
    });

    return NextResponse.json({ brief, matches, generated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Knowledge request failed.' },
      { status: 500 },
    );
  }
}
