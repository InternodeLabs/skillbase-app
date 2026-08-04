import { format, isThisYear, isToday, isYesterday } from "date-fns";
import Link from "next/link";
import type { ReactNode } from "react";

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
import { getUsernamesByUserIds } from "@/lib/users/profile";
import { GitForkIcon } from "lucide-react";

export async function SkillGrid({
  session,
  query,
  visibility = "public",
  ownerUserId,
  showOwner = true,
  empty,
}: {
  session?: Session | null;
  query?: string;
  visibility?: SkillVisibility;
  /** Limit the grid to one owner's skills. */
  ownerUserId?: string;
  /** Hide owner attribution (useful on a profile page). */
  showOwner?: boolean;
  empty?: ReactNode;
}) {
  const viewerUserId = session?.user.id ?? null;
  const skills = await getSkills(viewerUserId, {
    query,
    visibility,
    ownerUserId,
  });

  if (skills.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        {empty ??
          emptyMessage({ query, visibility, signedIn: Boolean(viewerUserId) })}
      </p>
    );
  }

  const owners =
    showOwner && session?.apiToken
      ? await lookupPortalUsers(
          skills.map((skill) => skill.ownerUserId),
          session.apiToken,
        )
      : new Map();
  const usernames = showOwner
    ? await getUsernamesByUserIds(skills.map((skill) => skill.ownerUserId))
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
        const ownerUsername = skill.ownerUserId
          ? (usernames.get(skill.ownerUserId) ?? null)
          : null;
        const ownerLabel = showOwner
          ? ownerDisplayName({
              portalName,
              isViewer,
              session,
            })
          : null;

        return (
          <li key={skill.id}>
            <div className="group overflow-hidden rounded-xl border border-border bg-tile-footer transition hover:shadow-md">
              <Link
                href={`/skills/${skill.id}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <div className="relative">
                  <SkillTilePreview skill={skill} />
                </div>
                <div className="bg-tile-footer px-3 pt-3">
                  <h2 className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
                    {skill.forkedFrom ? (
                      skill.forkedFrom.accessible ? null : (
                        <GitForkIcon className="size-3 text-muted" aria-hidden />
                      )
                    ) : null}
                    {skill.name}
                  </h2>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-2 bg-tile-footer px-3 pt-1 pb-3 text-xs text-muted">
                <span className="min-w-0 truncate">
                  {ownerLabel && ownerUsername ? (
                    <Link
                      href={`/${ownerUsername}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {ownerLabel}
                    </Link>
                  ) : (
                    (ownerLabel ?? "\u00a0")
                  )}
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
