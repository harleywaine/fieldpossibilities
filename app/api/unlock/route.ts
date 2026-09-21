import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, ACCESS_MAX_AGE, passwordMatches, safeNext, sessionToken } from '@/lib/access.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A plain form post, so the unlock screen works before any JavaScript loads. */
export async function POST(request: Request) {
  const form = await request.formData();
  const next = safeNext(form.get('next'));

  if (!passwordMatches(String(form.get('password') ?? ''))) {
    const back = new URL('/unlock', request.url);
    back.searchParams.set('error', '1');
    if (next !== '/') back.searchParams.set('next', next);
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(ACCESS_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && new URL(request.url).protocol === 'https:',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  return res;
}
