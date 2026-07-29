import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { createSkillVersion, deleteSkillVersion } from "@/lib/skills/data";

export async function POST(
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

  const { markdown } = body as { markdown?: unknown };
  if (typeof markdown !== "string") {
    return NextResponse.json(
      { error: "markdown is required." },
      { status: 400 },
    );
  }

  try {
    const skill = await createSkillVersion({
      skillId: id,
      markdown,
      authorUserId: session.user.id,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save version.";
    const status = message.includes("owner")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { versionNumber } = body as { versionNumber?: unknown };
  if (
    typeof versionNumber !== "number" ||
    !Number.isInteger(versionNumber) ||
    versionNumber < 1
  ) {
    return NextResponse.json(
      { error: "versionNumber must be a positive integer." },
      { status: 400 },
    );
  }

  try {
    const result = await deleteSkillVersion({
      skillId: id,
      versionNumber,
      ownerUserId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete version.";
    const status = message.includes("owner")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
