/**
 * GitHub-style handle: lowercase letters, digits, and single hyphens.
 * Can’t start/end with a hyphen or use consecutive hyphens.
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*$/;

/** Paths / product words that must never be claimable as a vanity URL. */
const RESERVED = new Set([
  "admin",
  "api",
  "app",
  "authenticating",
  "auth",
  "callback",
  "explore",
  "help",
  "login",
  "logout",
  "me",
  "new",
  "settings",
  "skill",
  "skills",
  "support",
  "upload",
  "www",
]);

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 39;

export type UsernameValidation =
  | { ok: true; username: string }
  | { ok: false; error: string };

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): UsernameValidation {
  const username = normalizeUsername(raw);

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be at most ${USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Use lowercase letters, numbers, and single hyphens. Can’t start or end with a hyphen.",
    };
  }
  if (RESERVED.has(username)) {
    return { ok: false, error: "That username is reserved." };
  }

  return { ok: true, username };
}
