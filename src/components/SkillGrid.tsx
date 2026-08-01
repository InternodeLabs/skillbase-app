import { format, isThisYear, isToday, isYesterday } from "date-fns";
import Link from "next/link";

import {
  SKILL_GRID_MIN_TILES,
  SkillSkeletonTile,
} from "@/components/SkillGridSkeleton";
import { SkillTilePreview } from "@/components/SkillTilePreview";
import { lookupPortalUsers } from "@/lib/auth/portal-users";
import type { Session } from "@/lib/auth/session";
import { loginStartHref } from "@/lib/auth/urls";
import { getSkills } from "@/lib/skills/data";
import type { SkillVisibility } from "@/lib/skills/types";

export async function SkillGrid({
  session,
  query,
  visibility = "public",
}: {
  session?: Session | null;
  query?: string;
  visibility?: SkillVisibility;
}) {
  const viewerUserId = session?.user.id ?? null;
  const skills = await getSkills(viewerUserId, { query, visibility });

  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        {emptyMessage({ query, visibility, signedIn: Boolean(viewerUserId) })}
      </p>
    );
  }

  const owners = session?.apiToken
    ? await lookupPortalUsers(
        skills.map((skill) => skill.ownerUserId),
        session.apiToken,
      )
    : new Map();

  const skeletonCount = Math.max(0, SKILL_GRID_MIN_TILES - skills.length);

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {skills.map((skill) => {
        const isViewer = Boolean(
          viewerUserId && skill.ownerUserId === viewerUserId,
        );
        const portalName = skill.ownerUserId
          ? (owners.get(skill.ownerUserId)?.name ?? null)
          : null;
        const ownerLabel = ownerDisplayName({
          portalName,
          isViewer,
          session,
        });

        return (
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
                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="min-w-0 truncate">
                    {ownerLabel ?? "\u00a0"}
                  </span>
                  {skill.updatedAt ? (
                    <time
                      className="shrink-0"
                      dateTime={skill.updatedAt.toISOString()}
                      title={`Last updated ${format(skill.updatedAt, "PPpp")}`}
                    >
                      {updatedAtLabel(skill.updatedAt)}
                    </time>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <li key={`skeleton-filler-${index}`} aria-hidden>
          <SkillSkeletonTile />
        </li>
      ))}
    </ul>
  );
}

function ownerDisplayName({
  portalName,
  isViewer,
  session,
}: {
  portalName: string | null;
  isViewer: boolean;
  session?: Session | null;
}): string | null {
  if (portalName) return isViewer ? "You" : portalName;
  if (isViewer) {
    return session?.user.name ?? session?.user.email ?? "You";
  }
  return null;
}

function updatedAtLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisYear(date)) return format(date, "MMM d");
  return format(date, "MMM d, yyyy");
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
