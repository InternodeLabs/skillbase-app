import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { VersionHistoryFloatover } from "@/components/VersionHistoryFloatover";
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
  const hasUsage = Boolean(skill.usage.trim());
  const hasParameters = skill.parameters.length > 0;
  const hasExampleOutput =
    Boolean(skill.exampleOutput.title.trim()) ||
    skill.exampleOutput.items.length > 0;

  return (
    <>
      <AppHeader
        user={session?.user}
        back={{ href: "/", label: "Skill Library" }}
        returnTo={returnTo}
      />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <section className="flex flex-col rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center justify-end">
            <VersionHistoryFloatover
              skillName={skill.name}
              versions={versionEntries}
            />
          </div>

          <MarkdownContent className="markdown-preview text-sm leading-relaxed text-foreground">
            {skill.description}
          </MarkdownContent>

          {hasUsage ? (
            <>
              <h2 className="mt-6 text-sm font-semibold">Usage</h2>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
                {skill.usage}
              </pre>
            </>
          ) : null}

          {hasParameters ? (
            <>
              <h2 className="mt-6 text-sm font-semibold">Parameters</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {skill.parameters.map((param) => (
                  <li key={param.name} className="flex gap-2">
                    <span aria-hidden className="text-muted">
                      •
                    </span>
                    <span>
                      <code className="font-mono font-medium text-foreground">
                        {param.name}
                      </code>{" "}
                      — {param.description}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {hasExampleOutput ? (
            <>
              <h2 className="mt-6 text-sm font-semibold">Example Output</h2>
              <div className="mt-2 rounded-lg border border-border bg-background p-4">
                {skill.exampleOutput.title ? (
                  <p className="text-sm font-medium text-foreground">
                    {skill.exampleOutput.title}
                  </p>
                ) : null}
                {skill.exampleOutput.items.length > 0 ? (
                  <ol className="mt-2 space-y-1 text-sm text-muted">
                    {skill.exampleOutput.items.map((item, index) => (
                      <li key={index}>
                        {index + 1}. {item}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </>
          ) : null}

          <div className="mt-auto pt-8">
            <div className="flex justify-center">
              {session ? (
                <button
                  type="button"
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  Edit skill
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  Edit skill
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="min-h-[28rem]">
          <ScenarioPreview scenarios={skill.scenarios} />
        </section>
      </main>
    </>
  );
}
