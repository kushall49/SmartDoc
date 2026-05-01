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

    // Redirect authenticated users away from auth pages
    if (
      token &&
      (pathname.startsWith('/auth/signin') ||
        pathname.startsWith('/auth/signup'))
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protect /dashboard/* routes
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
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
    '/dashboard/:path*',
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
