import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(request: NextRequest) {
    const token = (request as { nextauth?: { token?: unknown } }).nextauth?.token;
    const pathname = request.nextUrl.pathname;

    // Return JSON for unauthorized protected API requests to avoid client-side parse errors.
    if (
      !token &&
      pathname.startsWith('/api/') &&
      !pathname.startsWith('/api/auth') &&
      !pathname.startsWith('/api/health')
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow home page for everyone
        if (req.nextUrl.pathname === '/') {
          return true;
        }
        // Protect /dashboard/* routes
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        // Protect /profile route
        if (req.nextUrl.pathname.startsWith('/profile')) {
          return !!token;
        }
        // Let middleware return JSON 401 for unauthenticated protected API requests.
        if (
          req.nextUrl.pathname.startsWith('/api/') &&
          !req.nextUrl.pathname.startsWith('/api/auth') &&
          !req.nextUrl.pathname.startsWith('/api/health')
        ) {
          return true;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/profile/:path*',
    '/api/documents/:path*',
    '/api/chat/:path*',
    '/api/search/:path*',
    '/api/analytics/:path*',
    '/api/audit/:path*',
    '/api/intelligence/:path*',
    '/api/files/:path*',
    '/auth/:path*',
  ],
};
