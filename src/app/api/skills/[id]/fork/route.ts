import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { forkSkillFromVersion } from "@/lib/skills/data";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let versionNumber: number | undefined;
  try {
    const body = (await request.json()) as { versionNumber?: unknown };
    if (typeof body.versionNumber === "number" && Number.isInteger(body.versionNumber)) {
      versionNumber = body.versionNumber;
    } else if (
      typeof body.versionNumber === "string" &&
      /^\d+$/.test(body.versionNumber)
    ) {
      versionNumber = Number(body.versionNumber);
    }
  } catch {
    // Empty body is fine — fork the latest visible version.
  }

  try {
    const skill = await forkSkillFromVersion({
      sourceSkillId: id,
      versionNumber,
      ownerUserId: session.user.id,
    });
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not fork skill.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
