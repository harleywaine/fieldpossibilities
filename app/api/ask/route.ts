import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/db/client.ts';
import { extractRequirement } from '@/lib/ai/requirement.ts';
import { rankProduct } from '@/lib/ai/ranking.ts';
import { answerQuestion } from '@/lib/ai/explain.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Follow-up questions answered strictly against the named catalogue records. */
export async function POST(request: Request) {
  try {
    const { question, ids, query } = await request.json();
    if (typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No products in context.' }, { status: 400 });
    }

    const req = extractRequirement(typeof query === 'string' && query ? query : question);
    const scored = getProducts(ids.slice(0, 12).map(String)).map((p) =>
      rankProduct({ product: p, requirement: req, semanticScore: 0, lexicalScore: 0 }),
    );

    const answer = await answerQuestion(question, req, scored);
    return NextResponse.json({ answer, contextCount: scored.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unable to answer.' },
      { status: 500 },
    );
  }
}
