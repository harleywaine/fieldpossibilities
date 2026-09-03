import { NextResponse } from 'next/server';
import { computeRoi, recommendFirstPhase } from '@/lib/roi/model.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { inputs, overrides } = await request.json();
    const roi = computeRoi(inputs ?? {}, overrides ?? []);
    return NextResponse.json({ roi, recommendation: recommendFirstPhase(roi) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ROI calculation failed.' },
      { status: 500 },
    );
  }
}
