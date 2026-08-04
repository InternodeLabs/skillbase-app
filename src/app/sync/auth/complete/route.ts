import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getAppOrigin, SESSION_COOKIE } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/server";
import { claimUsernamePath, loginStartHref } from "@/lib/auth/urls";
import { getUsernameForUser } from "@/lib/users/profile";

/**
 * Handoff for Skillbase Sync (`ASWebAuthenticationSession`).
 *
 * If the browser session is signed in, redirect to
 * `skillbase-sync://auth?session=…&origin=…` so the Mac app can store the
 * signed session and call write APIs with `Authorization: Bearer`.
 * Otherwise send the user through the normal login entry, then back here.
 * Users without a Skillbase username claim one before the Sync handoff.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user.id) {
    const loginPath = loginStartHref("/sync/auth/complete");
    return NextResponse.redirect(new URL(loginPath, request.nextUrl.origin));
  }

  const username = await getUsernameForUser(session.user.id);
  if (!username) {
    return NextResponse.redirect(
      new URL(claimUsernamePath("/sync/auth/complete"), request.nextUrl.origin),
    );
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginPath = loginStartHref("/sync/auth/complete");
    return NextResponse.redirect(new URL(loginPath, request.nextUrl.origin));
  }

  const callback = new URL("skillbase-sync://auth");
  callback.searchParams.set("session", token);
  callback.searchParams.set("origin", getAppOrigin(request));
  return NextResponse.redirect(callback.toString());
}
