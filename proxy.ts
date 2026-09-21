import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, hasAccess } from '@/lib/access.ts';

/** Everything except the unlock screen itself and static files needs the password. */
export function proxy(request: NextRequest) {
  if (hasAccess(request.cookies.get(ACCESS_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'This demo is password protected.' }, { status: 401 });
  }
  const url = new URL('/unlock', request.url);
  if (pathname !== '/') url.searchParams.set('next', pathname + search);
  else if (search) url.searchParams.set('next', `/${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!unlock|api/unlock|_next/static|_next/image|favicon.ico|icon|apple-icon|catalogue-images).*)'],
};
