import { NextResponse, type NextRequest } from "next/server";

import {
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  PORTAL_BASE_URL,
  PORTAL_WEB_START_PATH,
  getRedirectUri,
  IS_PRODUCTION,
} from "@/lib/auth/config";
import { codeChallengeS256, randomToken } from "@/lib/auth/pkce";

/**
 * Begins the web PKCE login flow. Generates a code verifier + state, stashes
 * them in short-lived httpOnly cookies, then redirects the user to the portal's
 * central auth authority to sign in.
 */
export async function GET(request: NextRequest) {
  const state = randomToken(16);
  const codeVerifier = randomToken(32);
  const codeChallenge = await codeChallengeS256(codeVerifier);
  const redirectUri = getRedirectUri(request);

  // Preserve where the user was headed so we can return them there post-login.
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/";

  const startUrl = new URL(PORTAL_WEB_START_PATH, PORTAL_BASE_URL);
  startUrl.searchParams.set("redirect_uri", redirectUri);
  startUrl.searchParams.set("state", state);
  startUrl.searchParams.set("code_challenge", codeChallenge);
  startUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(startUrl.toString());

  const cookieBase = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes to complete the flow
  };

  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieBase);
  response.cookies.set(PKCE_VERIFIER_COOKIE, codeVerifier, cookieBase);
  // Stash the post-login destination alongside the state (safe: relative only).
  response.cookies.set(
    "skillbase_return_to",
    returnTo.startsWith("/") ? returnTo : "/",
    cookieBase,
  );

  return response;
}
