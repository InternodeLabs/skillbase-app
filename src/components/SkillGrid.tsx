import Link from "next/link";

import { SkillTilePreview } from "@/components/SkillTilePreview";
import { getSkills } from "@/lib/skills/data";

export async function SkillGrid({
  viewerUserId,
}: {
  viewerUserId?: string | null;
}) {
  const skills = await getSkills(viewerUserId);

  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        No skills yet. Upload a Markdown file to get started.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {skills.map((skill) => (
        <li key={skill.id}>
          <Link
            href={`/skills/${skill.id}`}
            className="group block overflow-hidden rounded-xl border border-border bg-tile-footer transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <div className="relative">
              <SkillTilePreview skill={skill} />
              {skill.forkedFrom ? (
                  <p className="mt-1.5 truncate text-[11px] text-muted absolute -bottom-1 right-0 py-1 px-2 bg-tile-footer rounded-tl-md">
                    {skill.forkedFrom.accessible
                      ? `Fork of ${skill.forkedFrom.skillName}`
                      : "Forked skill"}
                  </p>
                ) : null}
            </div>
            <div className="bg-tile-footer p-3">
              <h2 className="truncate text-sm font-medium text-foreground">
                {skill.name}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs text-muted">
                {skill.summary}
              </p>
              
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
