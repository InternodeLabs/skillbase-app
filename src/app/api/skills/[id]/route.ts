import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { lookupSkillVersion } from "@/lib/skills/data";
import { parseVersionParam } from "@/lib/skills/params";
import { matchesPrivateShareCode } from "@/lib/skills/share-access";

/**
 * Lightweight skill metadata for desktop sync clients.
 * Supports `?v=N` and private `?code=` the same way as the markdown endpoint.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  const { id } = await context.params;
  const url = new URL(request.url);
  const versionNumber = parseVersionParam(url.searchParams.get("v"));
  const code = url.searchParams.get("code") ?? undefined;
  const includePrivate = matchesPrivateShareCode(code);

  const lookup = await lookupSkillVersion(id, session?.user.id, {
    versionNumber,
    includePrivate,
  });

  if (lookup.status !== "live") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { skill } = lookup;
  return NextResponse.json({
    id: skill.id,
    name: skill.name,
    versionNumber: skill.versionNumber,
    versionId: skill.versionId,
    updatedAt: skill.updatedAt?.toISOString() ?? null,
    visibility: skill.visibility,
  });
}
