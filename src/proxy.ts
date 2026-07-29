import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";

/**
 * Route protection (Next.js "proxy" convention, formerly "middleware").
 * Protects everything except the login page and the auth API routes. If there's
 * no valid session, redirect to /login and remember where the user was going.
 */
export async function proxy(request: NextRequest) {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (session) return NextResponse.next();

  const loginUrl = new URL("/login", request.nextUrl.origin);
  const returnTo = request.nextUrl.pathname + request.nextUrl.search;
  if (returnTo && returnTo !== "/") {
    loginUrl.searchParams.set("returnTo", returnTo);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on all routes except: login page, auth API, Next internals, static assets.
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
