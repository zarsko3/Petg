import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment variables needed for this application:
// - MONGODB_URI: MongoDB connection string (e.g., mongodb://localhost:27017/petg-dev)
// - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Clerk public key for authentication
// - CLERK_SECRET_KEY: Clerk secret key for authentication
// - NEXT_PUBLIC_WEBSOCKET_URL: WebSocket server URL

// Check if Clerk API keys are configured
const isClerkAvailable = 
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('YOUR_PUBLISHABLE_KEY') &&
  process.env.CLERK_SECRET_KEY &&
  !process.env.CLERK_SECRET_KEY.includes('YOUR_SECRET_KEY');

let authMiddleware: any = () => {};

// Dynamic import to avoid build errors if Clerk is not configured
if (isClerkAvailable) {
  try {
    // Using import() for dynamic import
    const clerk = require('@clerk/nextjs');
    authMiddleware = clerk.authMiddleware;
  } catch (error) {
    console.error('Failed to load Clerk:', error);
    // Fallback to a simple middleware that does nothing
    authMiddleware = () => (req: NextRequest) => NextResponse.next();
  }
} else {
  // If Clerk is not configured, use a pass-through middleware
  authMiddleware = () => (req: NextRequest) => NextResponse.next();
}

// Simple middleware that allows all requests without authentication
export default function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 