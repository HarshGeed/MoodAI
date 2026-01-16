import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Protect all routes except public ones
  const isPublicRoute = nextUrl.pathname.startsWith("/login") || 
                       nextUrl.pathname.startsWith("/register") ||
                       nextUrl.pathname.startsWith("/api/auth") ||
                       nextUrl.pathname.startsWith("/_next") ||
                       nextUrl.pathname === "/favicon.ico"

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};