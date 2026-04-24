// Auth temporarily disabled - middleware allows all requests
import { NextResponse } from "next/server";

export default function middleware(req) {
  // Allow all requests during temporary auth disable
  return NextResponse.next();
}

// No routes are protected during temporary disable
export const config = {
  matcher: [
    // Empty matcher - no routes protected
  ],
};