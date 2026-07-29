import { notFound } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { SkillDetailPanel } from "@/components/SkillDetailPanel";
import { getSession } from "@/lib/auth/server";
import { getSkill, getSkillVersions } from "@/lib/skills/data";
import { loginStartHref } from "@/lib/auth/urls";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const { id } = await params;
  const skill = await getSkill(id, session?.user.id);
  if (!skill) notFound();

  const versions = await getSkillVersions(id, session?.user.id);
  const versionEntries = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
    changeSummary: version.changeSummary,
  }));

  const returnTo = `/skills/${skill.id}`;
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
          skill={skill}
          versions={versionEntries}
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
