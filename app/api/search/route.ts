import { NextResponse } from 'next/server';
import { retrieve } from '@/lib/ai/retrieval.ts';
import { explainSearch } from '@/lib/ai/explain.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { query, limit } = await request.json();
    if (typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'A query is required.' }, { status: 400 });
    }

    const result = retrieve(query, { limit: limit ?? 24 });
    const assessment = await explainSearch(result.requirement, result.results, {
      strong: result.trace.strong,
      potential: result.trace.potential,
    });

    return NextResponse.json({
      requirement: result.requirement,
      trace: result.trace,
      noConfirmedMatch: result.noConfirmedMatch,
      assessment,
      results: result.results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed.' },
      { status: 500 },
    );
  }
}
