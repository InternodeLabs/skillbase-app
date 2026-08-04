import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { createSkillFromMarkdown } from "@/lib/skills/data";
import { requireUsername } from "@/lib/users/profile";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireUsername(session.user.id);
  } catch (error) {
    const code =
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "USERNAME_REQUIRED"
        ? "USERNAME_REQUIRED"
        : undefined;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Choose a username before adding a skill.",
        code,
      },
      { status: 403 },
    );
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

  const { name, markdown } = body as { name?: unknown; markdown?: unknown };
  if (typeof name !== "string" || typeof markdown !== "string") {
    return NextResponse.json(
      { error: "name and markdown are required strings." },
      { status: 400 },
    );
  }

  try {
    const skill = await createSkillFromMarkdown({
      name,
      markdown,
      ownerUserId: session.user.id,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create skill.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
