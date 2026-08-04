/** Relative path only — reject protocol-relative and absolute URLs. */
export function sanitizeReturnTo(returnTo?: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/";
}

/**
 * Send signed-in users without a vanity username to `/` to claim one.
 * Preserve a safe `returnTo` so they continue after claiming.
 */
export function claimUsernamePath(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (safe === "/") return "/";
  return `/?returnTo=${encodeURIComponent(safe)}`;
}

/** Providers the portal `/api/auth/web/start` accepts (friendly aliases). */
export type AuthProvider = "google" | "microsoft";

export function isAuthProvider(value: string | null | undefined): value is AuthProvider {
  return value === "google" || value === "microsoft";
}

/**
 * Happy-path sign-in entry. Shows the provider picker on `/authenticating`, then
 * continues to `/api/auth/login` (Internode PKCE). Do not use `/login` here —
 * that page is for auth errors only.
 */
export function loginStartHref(returnTo?: string | null): string {
  const safe = sanitizeReturnTo(returnTo);
  if (safe !== "/") {
    return `/authenticating?returnTo=${encodeURIComponent(safe)}`;
  }
  return "/authenticating";
}

/** Internode PKCE start — used after the authenticating pause + provider choice. */
export function loginApiHref(
  returnTo?: string | null,
  provider?: AuthProvider | null,
): string {
  const params = new URLSearchParams();
  const safe = sanitizeReturnTo(returnTo);
  if (safe !== "/") {
    params.set("returnTo", safe);
  }
  if (provider && isAuthProvider(provider)) {
    params.set("provider", provider);
  }
  const qs = params.toString();
  return qs ? `/api/auth/login?${qs}` : "/api/auth/login";
}
