import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { discardSkillDraft, saveSkillDraft } from "@/lib/skills/data";

export async function PUT(
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
    const draft = await saveSkillDraft({
      skillId: id,
      markdown,
      ownerUserId: session.user.id,
    });
    return NextResponse.json({
      draftUpdatedAt: draft.draftUpdatedAt.toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save draft.";
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

  try {
    await discardSkillDraft({
      skillId: id,
      ownerUserId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not discard draft.";
    const status = message.includes("owner")
      ? 403
      : message.includes("not found")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
