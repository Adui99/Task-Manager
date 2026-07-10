import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

import { env } from "@/env";

const JWT_SECRET = env.JWT_SECRET;

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  
  // Public API routes
  if (request.nextUrl.pathname.startsWith('/api/auth/login') || request.nextUrl.pathname.startsWith('/api/auth/seed')) {
    return NextResponse.next();
  }

  if (!token) {
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    
    // Pass user details to headers for downstream access
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    // If logged in and trying to access login page, redirect to dashboard
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Role-based protection for admin routes
    if (request.nextUrl.pathname.startsWith('/admin') && payload.role !== 'admin' && payload.role !== 'vice_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("JWT verification failed:", error);
    // Invalid token
    if (!isAuthPage) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
