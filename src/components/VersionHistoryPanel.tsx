"use client";

import { format, isToday, isYesterday } from "date-fns";
import { History, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { SkillVisibility } from "@/lib/skills/types";

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

function versionLabel(versionNumber: number, deleted = false): string {
  return deleted
    ? `Version ${versionNumber}.0 (deleted)`
    : `Version ${versionNumber}.0`;
}

function versionTimeLabel(iso: string): string {
  return format(new Date(iso), "h:mm a");
}

function dayKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "do MMMM");
}

/** Group a newest-first timeline into calendar days (newest day first). */
function groupByDay(versions: VersionHistoryEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const version of versions) {
    const key = dayKey(version.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.versions.push(version);
    } else {
      groups.push({
        key,
        label: dayLabel(version.createdAt),
        versions: [version],
      });
    }
  }
  return groups;
}

function versionHref(
  skillId: string,
  versionNumber: number,
  latestVersionNumber: number,
) {
  if (versionNumber === latestVersionNumber) {
    return `/skills/${skillId}`;
  }
  return `/skills/${skillId}?v=${versionNumber}`;
}

function VersionTimeline({
  skillId,
  versions,
  selectedVersionId,
  selectedVersionNumber,
  latestVersionNumber,
  liveVersionCount,
  canEdit,
}: {
  skillId: string;
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
  selectedVersionNumber: number;
  latestVersionNumber: number;
  liveVersionCount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);

  // Newest first so the latest version sits at the top of the panel.
  const timeline = [...versions].toReversed();
  const dayGroups = groupByDay(timeline);

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
        if (redirectTo == null || redirectTo === newLatest) {
          router.push(`/skills/${skillId}`);
        } else {
          router.push(`/skills/${skillId}?v=${redirectTo}`);
        }
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
            <h3 className="relative z-10 mb-1 bg-surface py-1 pl-8 text-xs font-medium text-muted">
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
                const href = versionHref(
                  skillId,
                  version.versionNumber,
                  latestVersionNumber,
                );

                return (
                  <li key={version.id}>
                    <div
                      className={`relative flex w-full items-center gap-1 rounded-md py-2.5 pr-1 pl-1 ${
                        isSelected ? "bg-skeleton/70" : ""
                      } ${version.deleted ? "opacity-60" : ""}`}
                    >
                      {version.deleted ? (
                        <div className="flex min-w-0 flex-1 items-center gap-3 py-0 pl-0">
                          <span
                            aria-hidden
                            className="relative z-10 ml-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-muted bg-surface"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
                            <div className="flex min-w-0 items-baseline justify-between gap-3">
                              <span className="text-sm font-semibold text-muted">
                                {versionLabel(version.versionNumber, true)}
                              </span>
                              <time
                                dateTime={version.createdAt}
                                className="shrink-0 text-sm text-muted"
                              >
                                {versionTimeLabel(version.createdAt)}
                              </time>
                            </div>
                            <span className="text-xs text-muted">
                              {version.visibility === "public"
                                ? "Public"
                                : "Private"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-current={isSelected ? "true" : undefined}
                          onClick={() => {
                            router.push(href);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left transition hover:bg-skeleton/50"
                        >
                          <span
                            aria-hidden
                            className="relative z-10 ml-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px] bg-muted"
                          />
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pr-2">
                            <div className="flex min-w-0 items-baseline justify-between gap-3">
                              <span className="text-sm font-semibold text-foreground">
                                {versionLabel(version.versionNumber)}
                              </span>
                              <time
                                dateTime={version.createdAt}
                                className="shrink-0 text-sm text-muted"
                              >
                                {versionTimeLabel(version.createdAt)}
                              </time>
                            </div>
                            <span className="text-xs text-muted">
                              {version.visibility === "public"
                                ? "Public"
                                : "Private"}
                            </span>
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
  versions,
  selectedVersionId,
  selectedVersionNumber,
  liveVersionCount,
  canEdit,
}: {
  skillId: string;
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
  selectedVersionNumber: number;
  liveVersionCount: number;
  canEdit: boolean;
}) {
  const latestLive =
    [...versions].reverse().find((version) => !version.deleted) ?? null;
  const latestVersionNumber =
    latestLive?.versionNumber ?? selectedVersionNumber;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <History className="h-4 w-4 text-muted" aria-hidden />
        <h2 className="text-sm font-medium text-foreground">Version history</h2>
      </div>

      <VersionTimeline
        skillId={skillId}
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
