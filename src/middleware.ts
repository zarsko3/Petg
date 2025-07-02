import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment variables needed for this application:
// - MONGODB_URI: MongoDB connection string (e.g., mongodb://localhost:27017/petg-dev)
// - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Clerk public key for authentication
// - CLERK_SECRET_KEY: Clerk secret key for authentication
// - NEXT_PUBLIC_WEBSOCKET_URL: WebSocket server URL

// Simple middleware that allows all requests without authentication
// Authentication is handled per-route as needed
export default function middleware(req: NextRequest) {
  // 🔧 FIXED: Ensure manifest.json is always publicly accessible for PWA
  if (req.nextUrl.pathname === '/manifest.json') {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'public, max-age=86400');
    response.headers.set('Content-Type', 'application/manifest+json');
    return response;
  }
  
  // Allow all other requests to pass through
  // Authentication is handled at the component/API level
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - workbox-*.js (workbox files)
     * - icons/ (PWA icons)
     * - images/ (static images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox.*|icons/|images/).*)',
  ],
}; 