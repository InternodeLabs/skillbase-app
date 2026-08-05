import { cookies, headers } from "next/headers";

import { SESSION_COOKIE } from "./config";
import { verifySession, type Session } from "./session";

/**
 * Read + verify the current session inside a Server Component / route handler.
 *
 * Browser clients use the httpOnly cookie. Desktop Sync (and similar) send the
 * same signed session value as `Authorization: Bearer …`.
 *
 * Prefer `request.headers` when a Request is available — some runtimes are
 * flakier about exposing Authorization via `headers()` alone.
 */
export async function getSession(request?: Request): Promise<Session | null> {
  const store = await cookies();
  const fromCookie = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const auth =
    request?.headers.get("authorization") ??
    (await headers()).get("authorization");
  if (!auth) return null;

  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match?.[1]) return null;

  return verifySession(match[1].trim());
}
