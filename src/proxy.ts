import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    if (token) {
      // If user is pending and trying to access app pages, redirect to pending
      if (token.status === "PENDING" && path !== "/pending") {
        return NextResponse.redirect(new URL("/pending", req.url));
      }
      
      // If user is approved and trying to access pending, redirect to dashboard
      if (token.status === "APPROVED" && path === "/pending") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Role checking
      if (path.startsWith("/audit-logs") && token.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      if (path.startsWith("/settings") && !["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(token.role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      if (path.startsWith("/announcements") && !["COMPANY_OWNER", "IT_DEPARTMENT"].includes(token.role)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
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

export const config = {
  matcher: [
    "/accounts/:path*",
    "/announcements/:path*",
    "/chat/:path*",
    "/chat-space/:path*",
    "/settings/:path*",
    "/audit-logs/:path*",
    "/pending",
  ],
};
