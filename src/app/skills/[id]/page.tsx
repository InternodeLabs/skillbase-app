import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { SkillDetailPanel } from "@/components/SkillDetailPanel";
import { getSession } from "@/lib/auth/server";
import { getSkillVersions, lookupSkillVersion } from "@/lib/skills/data";
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
  searchParams: Promise<{
    v?: string | string[];
    edit?: string | string[];
    code?: string | string[];
  }>;
}) {
  const session = await getSession();
  const { id } = await params;
  const query = await searchParams;
  const versionNumber = parseVersionParam(query.v);
  const startInEdit = parseFlagParam(query.edit);
  const code = firstQueryValue(query.code);
  const includePrivate = matchesPrivateShareCode(code);

  const lookup = await lookupSkillVersion(id, session?.user.id, {
    versionNumber,
    includePrivate,
  });

  if (lookup.status === "deleted") {
    if (lookup.redirectToVersionNumber == null) notFound();
    const liveVersions = await getSkillVersions(lookup.skillId, session?.user.id, {
      includePrivate,
    });
    const latestLive =
      [...liveVersions].reverse().find((version) => !version.deleted)
        ?.versionNumber ?? lookup.redirectToVersionNumber;
    permanentRedirect(
      versionPath(
        lookup.skillId,
        lookup.redirectToVersionNumber,
        latestLive,
        { code: includePrivate ? code : undefined },
      ),
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
    [...versions].reverse().find((version) => !version.deleted)?.versionNumber ??
    skill.versionNumber ??
    1;
  const selectedVersionNumber = skill.versionNumber ?? latestVersionNumber;
  const isLatestVersion = selectedVersionNumber === latestVersionNumber;
  const liveVersionCount = versions.filter((version) => !version.deleted).length;

  const returnTo = skillSharePath(skill.id, {
    versionNumber: selectedVersionNumber,
    latestVersionNumber,
    code: includePrivate ? code : undefined,
  });
  const loginHref = loginStartHref(returnTo);
  const canEdit = Boolean(
    session?.user.id && skill.ownerUserId === session.user.id,
  );

  return (
    <>
      <AppHeader
        user={session?.user}
        returnTo={returnTo}
        showSearch={false}
      />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
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
        />

        <section className="min-h-112">
          <ScenarioPreview scenarios={skill.scenarios} />
        </section>
      </main>
    </>
  );
}
