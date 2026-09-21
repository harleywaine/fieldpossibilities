import { NextResponse } from 'next/server';
import { buildSimulatedRfq } from '@/lib/simulation/rfq.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json({ error: 'Describe what the customer needs.' }, { status: 400 });
    }
    return NextResponse.json(buildSimulatedRfq(query.trim().slice(0, 600)));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not build the quote request.' },
      { status: 500 },
    );
  }
}
