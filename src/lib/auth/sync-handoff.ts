/**
 * Short-lived one-time codes for Skillbase Sync login handoff.
 *
 * ASWebAuthenticationSession callback URLs cannot safely carry the full signed
 * session cookie (often 1–3KB+ with the portal apiToken) — truncation leaves
 * Sync with a non-empty but unverifiable Bearer token: `auth=true` in logs,
 * private skills still 404.
 *
 * Flow: `/sync/auth/complete` issues a code → Sync POSTs it to
 * `/api/sync/auth/exchange` → receives the full session in the JSON body.
 *
 * In-memory is enough for local/single-process. Durable store can replace this
 * later if handoff must span multiple serverless instances.
 */
type HandoffEntry = {
  sessionToken: string;
  expiresAt: number;
};

const TTL_MS = 2 * 60 * 1000;
const handoffs = new Map<string, HandoffEntry>();

function pruneExpired(now = Date.now()) {
  for (const [code, entry] of handoffs) {
    if (entry.expiresAt <= now) handoffs.delete(code);
  }
}

export function issueSyncAuthCode(sessionToken: string): string {
  pruneExpired();
  const code = crypto.randomUUID().replace(/-/g, "");
  handoffs.set(code, {
    sessionToken,
    expiresAt: Date.now() + TTL_MS,
  });
  return code;
}

export function consumeSyncAuthCode(code: string): string | null {
  pruneExpired();
  const entry = handoffs.get(code);
  if (!entry) return null;
  handoffs.delete(code);
  if (entry.expiresAt <= Date.now()) return null;
  return entry.sessionToken;
}
