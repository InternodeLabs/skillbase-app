import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/server";
import { getSkillVersions, lookupSkillVersion } from "@/lib/skills/data";
import { composeSkillMarkdown } from "@/lib/skills/markdown";
import { parseVersionParam, versionPath } from "@/lib/skills/params";
import { matchesPrivateShareCode } from "@/lib/skills/share-access";

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const;

async function resolveSkillMarkdown(
  id: string,
  request: Request,
): Promise<Response> {
  const session = await getSession();
  const url = new URL(request.url);
  const versionNumber = parseVersionParam(url.searchParams.get("v"));
  const code = url.searchParams.get("code") ?? undefined;
  const includePrivate = matchesPrivateShareCode(code);

  const lookup = await lookupSkillVersion(id, session?.user.id, {
    versionNumber,
    includePrivate,
  });

  if (lookup.status === "deleted") {
    if (lookup.redirectToVersionNumber == null) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: MARKDOWN_HEADERS,
      });
    }
    const liveVersions = await getSkillVersions(
      lookup.skillId,
      session?.user.id,
      { includePrivate },
    );
    const latestLive =
      [...liveVersions].reverse().find((version) => !version.deleted)
        ?.versionNumber ?? lookup.redirectToVersionNumber;
    const location = versionPath(
      lookup.skillId,
      lookup.redirectToVersionNumber,
      latestLive,
      {
        raw: true,
        code: includePrivate ? code : undefined,
      },
    );
    return NextResponse.redirect(new URL(location, request.url), 308);
  }

  if (lookup.status !== "live") {
    return new NextResponse("Not Found", {
      status: 404,
      headers: MARKDOWN_HEADERS,
    });
  }

  const body = composeSkillMarkdown(lookup.skill);
  return new NextResponse(body, { status: 200, headers: MARKDOWN_HEADERS });
}

/**
 * Skill markdown body. Reached via rewrite when `/skills/[id]?raw` is requested.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return resolveSkillMarkdown(id, request);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await resolveSkillMarkdown(id, request);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
