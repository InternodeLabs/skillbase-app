"use client";

import { format, isToday, isYesterday } from "date-fns";
import { History, Lock, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import type { SkillVisibility } from "@/lib/skills/types";
import { skillBrowsePath } from "@/lib/skills/params";

export type VersionHistoryEntry = {
  id: string;
  versionNumber: number;
  /** ISO timestamp */
  createdAt: string;
  changeSummary: string | null;
  deleted: boolean;
  isForked: boolean;
  visibility: SkillVisibility;
};

type DayGroup = {
  key: string;
  label: string;
  versions: VersionHistoryEntry[];
};

const emptySubscribe = () => () => {};

/** False on the server and during hydration; true after mount. */
function useIsHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function versionLabel(versionNumber: number, deleted = false): string {
  return deleted
    ? `Version ${versionNumber}.0 (deleted)`
    : `Version ${versionNumber}.0`;
}

/**
 * Date/time labels must match between SSR and the client's first paint.
 * Vercel is UTC; browsers use the user's timezone — so local `format` /
 * `isToday` diverge in production and throw React #418. Use UTC until
 * hydrated, then switch to local relative labels.
 */
function versionTimeLabel(iso: string, local: boolean): string {
  const date = new Date(iso);
  if (!local) {
    return date.toLocaleTimeString("en-US", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return format(date, "h:mm a");
}

function dayKey(iso: string, local: boolean): string {
  const date = new Date(iso);
  if (!local) return iso.slice(0, 10);
  return format(date, "yyyy-MM-dd");
}

function dayLabel(iso: string, local: boolean): string {
  const date = new Date(iso);
  if (!local) {
    return date.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "do MMMM");
}

/** Group a newest-first timeline into calendar days (newest day first). */
function groupByDay(
  versions: VersionHistoryEntry[],
  local: boolean,
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const version of versions) {
    const key = dayKey(version.createdAt, local);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.versions.push(version);
    } else {
      groups.push({
        key,
        label: dayLabel(version.createdAt, local),
        versions: [version],
      });
    }
  }
  return groups;
}

function versionHref(input: {
  skillId: string;
  slug?: string | null;
  ownerUsername?: string | null;
  versionNumber: number;
  latestVersionNumber: number;
}) {
  return skillBrowsePath({
    skillId: input.skillId,
    slug: input.slug,
    ownerUsername: input.ownerUsername,
    versionNumber: input.versionNumber,
    latestVersionNumber: input.latestVersionNumber,
  });
}

function VersionTimeline({
  skillId,
  slug,
  ownerUsername,
  versions,
  selectedVersionId,
  selectedVersionNumber,
  latestVersionNumber,
  liveVersionCount,
  canEdit,
}: {
  skillId: string;
  slug?: string | null;
  ownerUsername?: string | null;
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
  selectedVersionNumber: number;
  latestVersionNumber: number;
  liveVersionCount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const hydrated = useIsHydrated();

  // Newest first so the latest version sits at the top of the panel.
  const timeline = [...versions].toReversed();
  const dayGroups = groupByDay(timeline, hydrated);

  if (timeline.length === 0) {
    return <p className="px-4 py-8 text-sm text-muted">No versions yet.</p>;
  }

  async function deleteVersion(versionNumber: number) {
    if (deletingVersion != null) return;

    // Deleting the last live version removes the whole skill from the library.
    const deletesWholeSkill = liveVersionCount <= 1;
    if (
      deletesWholeSkill &&
      !window.confirm(
        "Delete this skill? This removes its only version and it will no longer appear in the library.",
      )
    ) {
      return;
    }

    setDeletingVersion(versionNumber);
    try {
      const response = await fetch(`/api/skills/${skillId}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });
      const data = (await response.json()) as {
        error?: string;
        redirectToVersionNumber?: number | null;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not delete version.");
      }

      const remainingLive = versions.filter(
        (version) =>
          !version.deleted && version.versionNumber !== versionNumber,
      );

      if (remainingLive.length === 0) {
        toast.success("Skill deleted");
        router.push("/");
        return;
      }

      const newLatest = Math.max(
        ...remainingLive.map((version) => version.versionNumber),
      );
      const redirectTo = data.redirectToVersionNumber;

      if (selectedVersionNumber === versionNumber) {
        router.push(
          versionHref({
            skillId,
            slug,
            ownerUsername,
            versionNumber: redirectTo ?? newLatest,
            latestVersionNumber: newLatest,
          }),
        );
      }
      router.refresh();
      toast.success(`Version ${versionNumber}.0 deleted`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete version.",
      );
    } finally {
      setDeletingVersion(null);
    }
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <span
        aria-hidden
        className="absolute top-5 bottom-5 left-5.5 w-px bg-border"
      />

      <div className="space-y-5">
        {dayGroups.map((group) => (
          <section key={group.key}>
            <h3 className="relative z-10 mb-1 bg-surface py-1 pl-6 text-xs font-medium text-muted">
              {group.label}
            </h3>
            <ol>
              {group.versions.map((version) => {
                const isSelected = version.id === selectedVersionId;
                // With newest-first order, this version's summary sits between it
                // and the older version below.
                const showDelta = Boolean(version.changeSummary);
                const canDelete =
                  canEdit && !version.deleted && !version.isForked;
                const deletesWholeSkill = canDelete && liveVersionCount <= 1;
                const href = versionHref({
                  skillId,
                  slug,
                  ownerUsername,
                  versionNumber: version.versionNumber,
                  latestVersionNumber,
                });

                return (
                  <li key={version.id}>
                    <div
                      className={`relative flex w-full items-center gap-1 rounded-md py-2.5 pr-1 -ml-1.5 ${
                        isSelected ? "bg-skeleton" : ""
                      } ${version.deleted ? "opacity-60" : ""}`}
                    >
                      {version.deleted ? (
                        <div className="flex min-w-0 flex-1 items-center gap-3 py-0 pl-0">
                          <span
                            aria-hidden
                            className={`relative z-10 ml-1.5 grid h-3.5 w-3.5 shrink-0 place-items-center ${
                              isSelected ? "bg-skeleton" : "bg-surface"
                            }`}
                          >
                            {version.visibility === "private" ? (
                              <Lock className="h-3.5 w-3.5 text-muted" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-[3px] border border-muted bg-surface" />
                            )}
                          </span>
                          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pr-2">
                            <span className="text-sm font-semibold text-muted">
                              {versionLabel(version.versionNumber, true)}
                            </span>
                            <time
                              dateTime={version.createdAt}
                              className="shrink-0 text-sm text-muted"
                            >
                              {versionTimeLabel(version.createdAt, hydrated)}
                            </time>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-current={isSelected ? "true" : undefined}
                          aria-label={
                            version.visibility === "private"
                              ? `${versionLabel(version.versionNumber)}, private`
                              : versionLabel(version.versionNumber)
                          }
                          onClick={() => {
                            router.push(href);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition hover:bg-skeleton/50"
                        >
                          <span
                            aria-hidden
                            className={`relative z-10 ml-1.5 grid h-3.5 w-3.5 shrink-0 place-items-center ${
                              isSelected ? "bg-skeleton" : "bg-surface"
                            }`}
                          >
                            {version.visibility === "private" ? (
                              <Lock className="h-3.5 w-3.5 text-muted" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-[3px] bg-muted" />
                            )}
                          </span>
                          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pr-2">
                            <span className="text-sm font-semibold text-foreground">
                              {versionLabel(version.versionNumber)}
                            </span>
                            <time
                              dateTime={version.createdAt}
                              className="shrink-0 text-sm text-muted"
                            >
                              {versionTimeLabel(version.createdAt, hydrated)}
                            </time>
                          </div>
                        </button>
                      )}

                      {canDelete ? (
                        <button
                          type="button"
                          aria-label={
                            deletesWholeSkill
                              ? "Delete skill"
                              : `Delete version ${version.versionNumber}`
                          }
                          title={
                            deletesWholeSkill
                              ? "Delete skill"
                              : "Delete version"
                          }
                          disabled={deletingVersion != null}
                          onClick={() =>
                            void deleteVersion(version.versionNumber)
                          }
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-background hover:text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>

                    {showDelta && version.changeSummary ? (
                      <div className="relative flex items-start gap-3 py-3 pr-2 pl-1">
                        <span
                          aria-hidden
                          className="relative z-10 ml-[0.55rem] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-border bg-surface"
                        />
                        <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
                          {version.changeSummary}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

export function VersionHistoryPanel({
  skillId,
  slug,
  ownerUsername,
  versions,
  selectedVersionId,
  selectedVersionNumber,
  liveVersionCount,
  canEdit,
}: {
  skillId: string;
  slug?: string | null;
  ownerUsername?: string | null;
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
  selectedVersionNumber: number;
  liveVersionCount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [creatingVersion, setCreatingVersion] = useState(false);
  const latestLive =
    [...versions].reverse().find((version) => !version.deleted) ?? null;
  const latestVersionNumber =
    latestLive?.versionNumber ?? selectedVersionNumber;

  const sourceVersion =
    versions.find(
      (version) =>
        version.versionNumber === selectedVersionNumber && !version.deleted,
    ) ?? latestLive;

  async function addVersionFromPrevious() {
    if (!canEdit || creatingVersion || !sourceVersion) return;

    setCreatingVersion(true);
    try {
      const markdownResponse = await fetch(
        `/api/skills/${skillId}/markdown?v=${sourceVersion.versionNumber}`,
      );
      if (!markdownResponse.ok) {
        throw new Error("Could not load the previous version.");
      }
      const markdown = (await markdownResponse.text()).trim();
      if (!markdown) {
        throw new Error("Previous version has no content to copy.");
      }

      const response = await fetch(`/api/skills/${skillId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          visibility: sourceVersion.visibility,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not create a new version.");
      }

      toast.success(
        `Created version ${(latestVersionNumber + 1).toFixed(0)}.0 from version ${sourceVersion.versionNumber}.0.`,
      );
      router.push(skillBrowsePath({ skillId }));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create a new version.",
      );
    } finally {
      setCreatingVersion(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <History className="h-4 w-4 text-muted" aria-hidden />
        <h2 className="text-sm font-medium text-foreground">Version history</h2>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void addVersionFromPrevious()}
            disabled={creatingVersion || !sourceVersion}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {creatingVersion ? "Adding…" : "New version"}
          </button>
        ) : null}
      </div>

      <VersionTimeline
        skillId={skillId}
        slug={slug}
        ownerUsername={ownerUsername}
        versions={versions}
        selectedVersionId={selectedVersionId}
        selectedVersionNumber={selectedVersionNumber}
        latestVersionNumber={latestVersionNumber}
        liveVersionCount={liveVersionCount}
        canEdit={canEdit}
      />
    </section>
  );
}
