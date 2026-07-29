import { SESSION_SECRET } from "./config";

/** The user shape returned by the portal exchange endpoint. */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  isAdmin?: boolean;
}

/** What we persist in the signed, httpOnly session cookie. */
export interface Session {
  /** Portal-issued bearer token used for authenticated API calls. */
  apiToken: string;
  /** Unix seconds at which the apiToken expires. */
  expiresAt: number;
  user: SessionUser;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Serialize + HMAC-sign a session into a cookie value: `<payload>.<sig>`. */
export async function signSession(session: Session): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const key = await importKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Verify + decode a cookie value back into a Session, or null if invalid/expired. */
export async function verifySession(
  cookieValue: string | undefined | null,
): Promise<Session | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = cookieValue.slice(0, dot);
  const signature = cookieValue.slice(dot + 1);

  try {
    const key = await importKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;

    const session = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as Session;

    if (!session.apiToken || !session.user?.id) return null;
    if (session.expiresAt && session.expiresAt * 1000 <= Date.now()) return null;

    return session;
  } catch {
    return null;
  }
}
