import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Allow access to change-password page without redirect loop
    if (path === "/change-password") {
      return NextResponse.next();
    }

    // If user must change password, redirect to change-password page
    if (token?.mustChangePassword === true) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }

    // Role-based access control
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/commercial") && !["ADMIN", "COMMERCIAL"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/marketing") && !["ADMIN", "MARKETING"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/commercial/:path*", "/marketing/:path*", "/change-password"],
};
