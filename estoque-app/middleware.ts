import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
};

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
