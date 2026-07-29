import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { updateLatestSkillVisibility } from "@/lib/skills/data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { visibility } = body as { visibility?: unknown };
  if (visibility !== "public" && visibility !== "private") {
    return NextResponse.json(
      { error: "visibility must be public or private." },
      { status: 400 },
    );
  }

  try {
    const skill = await updateLatestSkillVisibility({
      skillId: id,
      visibility,
      ownerUserId: session.user.id,
    });
    return NextResponse.json({ skill });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update visibility.";
    const status = message.includes("owner")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
