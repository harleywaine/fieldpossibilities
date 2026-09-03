import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/db/client.ts';
import { extractRequirement } from '@/lib/ai/requirement.ts';
import { rankProduct } from '@/lib/ai/ranking.ts';
import { explainComparison } from '@/lib/ai/explain.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { ids, query } = await request.json();
    if (!Array.isArray(ids) || ids.length < 2) {
      return NextResponse.json({ error: 'Select at least two products.' }, { status: 400 });
    }
    const req = extractRequirement(typeof query === 'string' ? query : '');
    const scored = getProducts(ids.slice(0, 4).map(String)).map((p) =>
      rankProduct({ product: p, requirement: req, semanticScore: 0, lexicalScore: 0 }),
    );
    const assessment = await explainComparison(req.raw ? req : null, scored);
    return NextResponse.json({ assessment });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Comparison failed.' },
      { status: 500 },
    );
  }
}
