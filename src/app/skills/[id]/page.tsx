import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { ScenarioPreview } from "@/components/ScenarioPreview";
import { getSession } from "@/lib/auth/server";
import { getSkill } from "@/lib/skills/data";

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const skill = getSkill(id);
  if (!skill) notFound();

  return (
    <>
      <AppHeader
        user={session.user}
        back={{ href: "/", label: "Skill Library" }}
      />

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2">
        {/* Left column: skill definition */}
        <section className="flex flex-col rounded-xl border border-border bg-surface p-6">
          <h1 className="text-xl font-semibold tracking-tight">{skill.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {skill.description}
          </p>

          <h2 className="mt-6 text-sm font-semibold">Usage</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
            {skill.usage}
          </pre>

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

          <h2 className="mt-6 text-sm font-semibold">Example Output</h2>
          <div className="mt-2 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              {skill.exampleOutput.title}
            </p>
            <ol className="mt-2 space-y-1 text-sm text-muted">
              {skill.exampleOutput.items.map((item, index) => (
                <li key={index}>
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex justify-center">
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
              >
                Edit skill
              </button>
            </div>
          </div>
        </section>

        {/* Right column: scenario preview */}
        <section className="min-h-[28rem]">
          <ScenarioPreview scenarios={skill.scenarios} />
        </section>
      </main>
    </>
  );
}
