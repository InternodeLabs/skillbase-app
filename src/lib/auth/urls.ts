/**
 * Happy-path sign-in entry. Shows a brief "Authenticating…" interstitial, then
 * continues to `/api/auth/login` (Internode PKCE). Do not use `/login` here —
 * that page is for auth errors only.
 */
export function loginStartHref(returnTo?: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return `/authenticating?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return "/authenticating";
}

/** Internode PKCE start — used by the authenticating interstitial after the pause. */
export function loginApiHref(returnTo?: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return "/api/auth/login";
}
