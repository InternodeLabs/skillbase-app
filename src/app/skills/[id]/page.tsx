import { notFound } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { SkillDetailPanel } from "@/components/SkillDetailPanel";
import { getSession } from "@/lib/auth/server";
import { getSkill, getSkillVersions } from "@/lib/skills/data";
import { loginStartHref } from "@/lib/auth/urls";

function parseVersionParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= 1 ? n : undefined;
}

function parseFlagParam(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[]; edit?: string | string[] }>;
}) {
  const session = await getSession();
  const { id } = await params;
  const query = await searchParams;
  const versionNumber = parseVersionParam(query.v);
  const startInEdit = parseFlagParam(query.edit);

  const skill = await getSkill(id, session?.user.id, { versionNumber });
  if (!skill) notFound();

  const versions = await getSkillVersions(id, session?.user.id);
  const versionEntries = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
    changeSummary: version.changeSummary,
  }));

  const latestVersionNumber =
    versions[versions.length - 1]?.versionNumber ?? skill.versionNumber ?? 1;
  const selectedVersionNumber = skill.versionNumber ?? latestVersionNumber;
  const isLatestVersion = selectedVersionNumber === latestVersionNumber;

  const returnTo = isLatestVersion
    ? `/skills/${skill.id}`
    : `/skills/${skill.id}?v=${selectedVersionNumber}`;
  const loginHref = loginStartHref(returnTo);
  const canEdit = Boolean(
    session?.user.id && skill.ownerUserId === session.user.id,
  );

  return (
    <>
      <AppHeader
        user={session?.user}
        back={{ href: "/", label: "Skill Library" }}
        returnTo={returnTo}
      />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <SkillDetailPanel
          key={skill.versionId ?? `${skill.id}-${selectedVersionNumber}`}
          skill={skill}
          versions={versionEntries}
          selectedVersionId={skill.versionId ?? null}
          selectedVersionNumber={selectedVersionNumber}
          isLatestVersion={isLatestVersion}
          initialEditing={startInEdit && canEdit && isLatestVersion}
          loginHref={loginHref}
          signedIn={Boolean(session)}
          canEdit={canEdit}
        />

        <section className="min-h-[28rem]">
          <ScenarioPreview scenarios={skill.scenarios} />
        </section>
      </main>
    </>
  );
}
