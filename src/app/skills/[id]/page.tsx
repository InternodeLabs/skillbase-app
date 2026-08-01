import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { SkillDetailPanel } from "@/components/SkillDetailPanel";
import { getSession } from "@/lib/auth/server";
import type { Session } from "@/lib/auth/session";
import { lookupPortalUsers } from "@/lib/auth/portal-users";
import { getSkillVersions, lookupSkillVersion } from "@/lib/skills/data";
import { RESERVED_SKILL_QUERY_PARAMS } from "@/lib/skills/markdown";
import {
  parseVersionParam,
  skillSharePath,
  versionPath,
} from "@/lib/skills/params";
import { matchesPrivateShareCode } from "@/lib/skills/share-access";
import { loginStartHref } from "@/lib/auth/urls";

function parseFlagParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export interface SkillOwner {
  name: string | null;
  image: string | null;
  isViewer: boolean;
}

/**
 * Resolve the skill owner's display info via the portal directory. Uses the
 * viewer's bearer token, so logged-out visitors won't get a name. Falls back to
 * the session profile when the viewer is the owner.
 */
async function resolveOwner(
  ownerUserId: string | undefined,
  session: Session | null,
  isViewer: boolean,
): Promise<SkillOwner | null> {
  if (!ownerUserId) return null;

  let name: string | null = null;
  let image: string | null = null;

  if (session?.apiToken) {
    const users = await lookupPortalUsers([ownerUserId], session.apiToken);
    const owner = users.get(ownerUserId);
    name = owner?.name ?? null;
    image = owner?.image ?? null;
  }

  if (!name && isViewer && session?.user) {
    name = session.user.name ?? session.user.email ?? null;
    image = session.user.image ?? null;
  }

  if (!name) return null;
  return { name, image, isViewer };
}

/** Non-reserved query values for `{{param}}` substitution in the skill body. */
function templateParamsFromQuery(
  query: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED_SKILL_QUERY_PARAMS.has(key)) continue;
    const raw = firstQueryValue(value);
    if (raw === undefined) continue;
    params[key] = raw;
  }
  return params;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[]; code?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const query = await searchParams;
  const versionNumber = parseVersionParam(query.v);
  const code = firstQueryValue(query.code);
  const unlock = matchesPrivateShareCode(code);

  return {
    alternates: {
      types: {
        "text/markdown": skillSharePath(id, {
          versionNumber,
          raw: true,
          code: unlock ? code : undefined,
        }),
      },
    },
  };
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const { id } = await params;
  const query = await searchParams;
  const versionNumber = parseVersionParam(query.v);
  const startInEdit = parseFlagParam(query.edit);
  const code = firstQueryValue(query.code);
  const includePrivate = matchesPrivateShareCode(code);
  const templateParams = templateParamsFromQuery(query);

  const lookup = await lookupSkillVersion(id, session?.user.id, {
    versionNumber,
    includePrivate,
  });

  if (lookup.status === "deleted") {
    if (lookup.redirectToVersionNumber == null) notFound();
    const liveVersions = await getSkillVersions(
      lookup.skillId,
      session?.user.id,
      {
        includePrivate,
      },
    );
    const latestLive =
      [...liveVersions].reverse().find((version) => !version.deleted)
        ?.versionNumber ?? lookup.redirectToVersionNumber;
    permanentRedirect(
      versionPath(lookup.skillId, lookup.redirectToVersionNumber, latestLive, {
        code: includePrivate ? code : undefined,
      }),
    );
  }

  if (lookup.status !== "live") notFound();
  const skill = lookup.skill;

  const versions = await getSkillVersions(id, session?.user.id, {
    includePrivate,
  });
  const versionEntries = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
    changeSummary: version.changeSummary,
    deleted: version.deleted,
    isForked: version.isForked,
    visibility: version.visibility,
  }));

  const latestVersionNumber =
    [...versions].reverse().find((version) => !version.deleted)
      ?.versionNumber ??
    skill.versionNumber ??
    1;
  const selectedVersionNumber = skill.versionNumber ?? latestVersionNumber;
  const isLatestVersion = selectedVersionNumber === latestVersionNumber;
  const liveVersionCount = versions.filter(
    (version) => !version.deleted,
  ).length;

  const returnTo = skillSharePath(skill.id, {
    versionNumber: selectedVersionNumber,
    latestVersionNumber,
    code: includePrivate ? code : undefined,
  });
  const loginHref = loginStartHref(returnTo);
  const canEdit = Boolean(
    session?.user.id && skill.ownerUserId === session.user.id,
  );

  const owner = await resolveOwner(skill.ownerUserId, session, canEdit);

  return (
    <>
      <AppHeader user={session?.user} returnTo={returnTo} showSearch={false} />

      <main className="mx-auto w-full max-w-4xl  gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <SkillDetailPanel
          key={skill.versionId ?? `${skill.id}-${selectedVersionNumber}`}
          skill={skill}
          versions={versionEntries}
          selectedVersionId={skill.versionId ?? null}
          selectedVersionNumber={selectedVersionNumber}
          isLatestVersion={isLatestVersion}
          liveVersionCount={liveVersionCount}
          initialEditing={startInEdit && canEdit && isLatestVersion}
          loginHref={loginHref}
          signedIn={Boolean(session)}
          canEdit={canEdit}
          owner={owner}
          templateParams={templateParams}
        />
      </main>
    </>
  );
}
