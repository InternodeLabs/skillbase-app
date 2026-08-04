import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { claimUsername, getUserProfile } from "@/lib/users/profile";

export async function GET() {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  return NextResponse.json({
    profile: profile
      ? { username: profile.username, createdAt: profile.createdAt }
      : null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username } = body as { username?: unknown };
  if (typeof username !== "string") {
    return NextResponse.json(
      { error: "username is required." },
      { status: 400 },
    );
  }

  try {
    const profile = await claimUsername({
      userId: session.user.id,
      username,
    });
    return NextResponse.json(
      { profile: { username: profile.username, createdAt: profile.createdAt } },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not claim username.";
    const status = message.includes("already have") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
