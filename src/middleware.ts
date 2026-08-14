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
      
      if (path.startsWith("/settings") && !["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(token.role as string)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      if (path.startsWith("/announcements") && !["SUPER_ADMIN", "COMPANY_OWNER", "IT_DEPARTMENT"].includes(token.role as string)) {
        return NextResponse.redirect(new URL("/", req.url));
      }

      if (path.startsWith("/companies") && token.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }

      if (path.startsWith("/system-health") && !["SUPER_ADMIN", "IT_DEPARTMENT", "COMPANY_OWNER"].includes(token.role as string)) {
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
    "/associates-requests/:path*",
    "/attendance/:path*",
    "/audit-logs/:path*",
    "/chat-space/:path*",
    "/companies/:path*",
    "/feedback/:path*",
    "/it-accounts-parser/:path*",
    "/it-management/:path*",
    "/it-operational-logs/:path*",
    "/leave-requests/:path*",
    "/live-team-operations/:path*",
    "/master-accounts-pool/:path*",
    "/my-team/:path*",
    "/pending",
    "/personal-notes/:path*",
    "/screen-telemetry/:path*",
    "/settings/:path*",
    "/special-requests/:path*",
    "/system-health/:path*",
    "/team-leads/:path*",
    "/team-live-roster/:path*",
    "/team-performance-stats/:path*",
    "/uk-market-trends/:path*",
    "/user-directory/:path*",
    "/workstation-telemetry/:path*"
  ],
};
