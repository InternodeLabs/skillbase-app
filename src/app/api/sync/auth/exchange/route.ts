import { NextResponse } from "next/server";

import { consumeSyncAuthCode } from "@/lib/auth/sync-handoff";

/**
 * Exchange a one-time Sync login code for the signed session cookie value.
 * Called by the Mac app after `/sync/auth/complete` redirects with `?code=`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const code =
    body && typeof body === "object" && "code" in body
      ? (body as { code?: unknown }).code
      : undefined;

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }

  const session = consumeSyncAuthCode(code.trim());
  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired login code. Sign in again." },
      { status: 401 },
    );
  }

  return NextResponse.json({ session });
}
