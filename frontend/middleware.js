import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // You can add additional logic here if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

// Specify which routes should be protected
export const config = {
  matcher: [
    "/tools/:path*", // protect all tools pages
    "/profile/:path*",
    "/dashboard/:path*",
  ],
};