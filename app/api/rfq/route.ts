import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { appendRfq, listRfqs } from '@/lib/rfq/store.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Records a demonstration RFQ locally (brief §32). Nothing is transmitted to
 * Field — this prototype has no commercial backend integration.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const required = ['company', 'contact', 'email'];
    const missing = required.filter((f) => !String(body[f] ?? '').trim());
    if (missing.length) {
      return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 });
    }

    const record = {
      id: randomUUID().slice(0, 8).toUpperCase(),
      createdAt: new Date().toISOString(),
      company: String(body.company),
      contact: String(body.contact),
      email: String(body.email),
      location: String(body.location ?? ''),
      aircraft: String(body.aircraft ?? ''),
      requirement: String(body.requirement ?? ''),
      requiredDate: String(body.requiredDate ?? ''),
      additional: String(body.additional ?? ''),
      productIds: Array.isArray(body.productIds) ? body.productIds.map(String) : [],
      demo: true as const,
    };

    appendRfq(record);
    return NextResponse.json({ ok: true, reference: record.id, record });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to record request.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ requests: listRfqs() });
}
