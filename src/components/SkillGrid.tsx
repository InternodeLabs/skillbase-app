import Link from "next/link";

import {
  SKILL_GRID_MIN_TILES,
  SkillSkeletonTile,
} from "@/components/SkillGridSkeleton";
import { SkillTilePreview } from "@/components/SkillTilePreview";
import { getSkills } from "@/lib/skills/data";
import type { SkillVisibility } from "@/lib/skills/types";
import { loginStartHref } from "@/lib/auth/urls";

export async function SkillGrid({
  viewerUserId,
  query,
  visibility = "public",
}: {
  viewerUserId?: string | null;
  query?: string;
  visibility?: SkillVisibility;
}) {
  const skills = await getSkills(viewerUserId, { query, visibility });

  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        {emptyMessage({ query, visibility, signedIn: Boolean(viewerUserId) })}
      </p>
    );
  }

  const skeletonCount = Math.max(0, SKILL_GRID_MIN_TILES - skills.length);

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
                <p className="absolute -bottom-1 right-0 mt-1.5 truncate rounded-tl-md bg-tile-footer px-2 py-1 text-[11px] text-muted">
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
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <li key={`skeleton-filler-${index}`} aria-hidden>
          <SkillSkeletonTile />
        </li>
      ))}
    </ul>
  );
}

function emptyMessage({
  query,
  visibility,
  signedIn,
}: {
  query?: string;
  visibility: SkillVisibility;
  signedIn: boolean;
}) {
  if (query) return `No skills match “${query}”.`;

  if (visibility === "private") {
    if (!signedIn) {
      return (
        <div className="space-y-2">
          <div className="text-muted">To see your private skills.</div>
          <Link
            href={loginStartHref("/?visibility=private")}
            className="btn-secondary"
          >
            Sign in
          </Link>{" "}
        </div>
      );
    }
    return "No private skills yet. Upload a Markdown file to get started.";
  }

  return "No skills yet. Upload a Markdown file to get started.";
}
