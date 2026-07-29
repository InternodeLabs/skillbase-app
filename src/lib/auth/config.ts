import type { NextRequest } from "next/server";

/**
 * Configuration for consuming the portal-frontend central auth authority.
 *
 * Skillbase does NOT implement its own identity provider. It behaves like the
 * Chrome extension / iOS app: it redirects to the portal, lets the portal's
 * NextAuth session authenticate the user, then exchanges a one-time code for a
 * portal-issued bearer token via a PKCE flow.
 *
 * The portal side must expose (see README "Portal-side integration"):
 *   GET  {PORTAL_BASE_URL}/api/auth/web/start
 *   POST {PORTAL_BASE_URL}/api/auth/web/exchange
 * and allowlist this app's redirect_uri origin.
 */

export const PORTAL_BASE_URL = (
  process.env.PORTAL_BASE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** Portal endpoint that begins the web PKCE flow. */
export const PORTAL_WEB_START_PATH = "/api/auth/web/start";
/** Portal endpoint that exchanges an auth code for a bearer token. */
export const PORTAL_WEB_EXCHANGE_PATH = "/api/auth/web/exchange";

/** Secret used to sign the local session cookie (HMAC-SHA256). */
export const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-insecure-session-secret-change-me";

export const SESSION_COOKIE = "skillbase_session";
export const PKCE_VERIFIER_COOKIE = "skillbase_pkce_verifier";
export const OAUTH_STATE_COOKIE = "skillbase_oauth_state";

/** Are we running over https? Controls the `secure` cookie flag. */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Resolve the public origin of this app so we can build the redirect_uri that
 * the portal will send the user back to. Prefers an explicit APP_URL, then the
 * Vercel-provided host, then the incoming request origin.
 */
export function getAppOrigin(request: NextRequest): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

  return request.nextUrl.origin;
}

export function getRedirectUri(request: NextRequest): string {
  return `${getAppOrigin(request)}/api/auth/callback`;
}
