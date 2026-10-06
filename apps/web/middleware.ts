import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // API authentication is enforced by the backend, including proxied requests.
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }
  const token = request.cookies.get('auth_token')?.value;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
