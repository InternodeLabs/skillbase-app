import { NextResponse, type NextRequest } from "next/server";

import {
  IS_PRODUCTION,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  PORTAL_BASE_URL,
  PORTAL_WEB_EXCHANGE_PATH,
  SESSION_COOKIE,
  getRedirectUri,
} from "@/lib/auth/config";
import { signSession, type Session } from "@/lib/auth/session";

function loginError(request: NextRequest, reason: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url.toString());
  // Clear the transient PKCE cookies regardless of outcome.
  for (const name of [OAUTH_STATE_COOKIE, PKCE_VERIFIER_COOKIE, "skillbase_return_to"]) {
    response.cookies.delete(name);
  }
  return response;
}

/**
 * Portal redirects the user back here with `?code=&state=`. We verify the
 * state, exchange the code (+ PKCE verifier) for a portal bearer token, and
 * persist it in a signed, httpOnly session cookie.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const portalError = params.get("error");
  if (portalError) return loginError(request, portalError);

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const returnTo = request.cookies.get("skillbase_return_to")?.value ?? "/";

  if (!code || !state || !expectedState || state !== expectedState) {
    return loginError(request, "invalid_state");
  }
  if (!codeVerifier) {
    return loginError(request, "missing_verifier");
  }

  let payload: {
    apiToken?: string;
    expiresAt?: number;
    user?: Session["user"];
  };

  try {
    const exchangeUrl = new URL(PORTAL_WEB_EXCHANGE_PATH, PORTAL_BASE_URL);
    const res = await fetch(exchangeUrl.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri: getRedirectUri(request),
      }),
      cache: "no-store",
    });

    if (!res.ok) return loginError(request, "exchange_failed");
    payload = await res.json();
  } catch {
    return loginError(request, "exchange_unreachable");
  }

  if (!payload.apiToken || !payload.user?.id) {
    return loginError(request, "invalid_exchange_response");
  }

  const session: Session = {
    apiToken: payload.apiToken,
    expiresAt: payload.expiresAt ?? Math.floor(Date.now() / 1000) + 6 * 60 * 60,
    user: payload.user,
  };

  const destination = returnTo.startsWith("/") ? returnTo : "/";
  const response = NextResponse.redirect(
    new URL(destination, request.nextUrl.origin).toString(),
  );

  response.cookies.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, session.expiresAt - Math.floor(Date.now() / 1000)),
  });

  for (const name of [OAUTH_STATE_COOKIE, PKCE_VERIFIER_COOKIE, "skillbase_return_to"]) {
    response.cookies.delete(name);
  }

  return response;
}
