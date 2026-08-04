"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Download,
  EllipsisVertical,
  Eye,
  EyeOff,
  GitForkIcon,
  Pencil,
  Pin,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const actionIconButtonClass =
  "inline-flex flex-1 items-center justify-center rounded-md border border-border py-2 text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";

import { useSkillDetail } from "@/components/SkillDetailContext";
import { skillBrowsePath } from "@/lib/skills/params";
import { buildSkillSharePath } from "@/lib/skills/share-access";
import type { SkillVisibility } from "@/lib/skills/types";

function markdownFilename(name: string): string {
  const base =
    name
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Z0-9_]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "SKILL";
  return `${base}.md`;
}

function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SkillActionsPanel() {
  const {
    skill,
    skillId,
    selectedVersionNumber,
    isLatestVersion,
    canEdit,
    signedIn,
    loginHref,
    showDraft,
    editing,
    draft,
    editorRef,
    viewMarkdownSource,
    draftStatusLabel,
    draftStatus,
    publishVisibility,
    setPublishVisibility,
    publishing,
    forking,
    deleting,
    shareLockedVersion,
    setShareLockedVersion,
    currentVisibility,
    canDeleteCurrent,
    deletesWholeSkill,
    startEditing,
    stopEditing,
    discardDraft,
    publishVersion,
    forkAndEdit,
    deleteCurrentVersion,
    copyShareLink,
  } = useSkillDetail();

  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [showShareUrl, setShowShareUrl] = useState(false);
  const [previewForAgent, setPreviewForAgent] = useState(true);

  const sharePath = buildSkillSharePath({
    skillId,
    visibility: currentVisibility,
    selectedVersionNumber,
    shareForAgent: previewForAgent,
    shareLockedVersion,
  });
  const shareUrl = origin ? new URL(sharePath, origin).toString() : sharePath;

  function handleCopy(forAgent: boolean) {
    setPreviewForAgent(forAgent);
    void copyShareLink(forAgent);
  }

  function handleDownload() {
    const content = editing
      ? (editorRef.current?.getMarkdown() ?? draft)
      : viewMarkdownSource;
    downloadMarkdownFile(markdownFilename(skill.name), content);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      {editing ? (
        <div className="flex flex-col gap-3">
          <p
            className={`min-w-0 truncate text-sm font-medium ${
              draftStatus === "error" ? "text-red-600" : "text-muted"
            }`}
          >
            {draftStatusLabel ?? "\u00a0"}
          </p>
          <div
            role="group"
            aria-label="Visibility for this version"
            className="inline-flex w-fit rounded-md border border-border p-0.5"
          >
            {(
              [
                ["private", "Private"],
                ["public", "Public"],
              ] as const
            ).map(([value, label]: readonly [SkillVisibility, string]) => {
              const selected = publishVisibility === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={publishing || !canEdit}
                  aria-pressed={selected}
                  onClick={() => setPublishVisibility(value)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
                    selected
                      ? "bg-background text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={publishing || !canEdit}
              onClick={() => void publishVersion()}
              className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {publishing ? "Publishing…" : "Publish version"}
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  disabled={publishing}
                  aria-label="More editing actions"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-background disabled:opacity-40"
                >
                  <EllipsisVertical className="size-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-40 rounded-md border border-border bg-surface p-1 shadow-md"
                >
                  <DropdownMenu.Item
                    disabled={publishing}
                    onSelect={() => void stopEditing()}
                    className="cursor-pointer rounded px-3 py-2 text-sm text-foreground outline-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-background"
                  >
                    Done
                  </DropdownMenu.Item>
                  {canEdit ? (
                    <DropdownMenu.Item
                      disabled={publishing}
                      onSelect={() => void discardDraft()}
                      className="cursor-pointer rounded px-3 py-2 text-sm text-muted outline-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-background data-highlighted:text-foreground"
                    >
                      Discard draft
                    </DropdownMenu.Item>
                  ) : null}
                  <DropdownMenu.Item
                    disabled={publishing || forking}
                    onSelect={() => void forkAndEdit()}
                    className="cursor-pointer rounded px-3 py-2 text-sm text-foreground outline-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-background"
                  >
                    Fork
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2  border-b border-border pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-foreground ml-1">
                Copy a share link
              </div>
              <div className="flex items-center gap-0">
                <button
                  type="button"
                  onClick={() => setShareLockedVersion(!shareLockedVersion)}
                  aria-label={
                    shareLockedVersion
                      ? `Unpin from version ${selectedVersionNumber}.0`
                      : `Pin to version ${selectedVersionNumber}.0`
                  }
                  title={
                    shareLockedVersion
                      ? `Unpin from version ${selectedVersionNumber}.0`
                      : `Pin to version ${selectedVersionNumber}.0`
                  }
                  aria-pressed={shareLockedVersion}
                  className={`inline-flex size-7 items-center justify-center rounded-md transition hover:bg-background ${
                    shareLockedVersion
                      ? "text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Pin
                    className={`size-3 ${shareLockedVersion ? "fill-current" : ""}`}
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setShowShareUrl((open) => !open)}
                  aria-label={
                    showShareUrl ? "Hide share link" : "Show share link"
                  }
                  aria-pressed={showShareUrl}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
                >
                  {showShareUrl ? (
                    <EyeOff className="size-3.5" aria-hidden />
                  ) : (
                    <Eye className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            {showShareUrl ? (
              <textarea
                readOnly
                value={shareUrl}
                rows={2}
                className="mb-1 w-full resize-none rounded-md border-none bg-gray-50 px-2 py-1.5 text-xs text-foreground outline-none"
              />
            ) : null}
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleCopy(false)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
              >
                Link to page
              </button>
              <button
                type="button"
                onClick={() => handleCopy(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:bg-background"
              >
                Link to markdown
              </button>
            </div>
          </div>

          <div className="flex gap-1.5" role="group" aria-label="Skill actions">
            <button
              type="button"
              onClick={handleDownload}
              aria-label="Download"
              title="Download"
              className={actionIconButtonClass}
            >
              <Download className="size-3.5" aria-hidden />
            </button>

            {canEdit && !isLatestVersion ? (
              <Link
                href={skillBrowsePath({
                  skillId,
                  slug: skill.slug,
                  ownerUsername: skill.ownerUsername,
                })}
                aria-label="View latest"
                title="View latest"
                className={actionIconButtonClass}
              >
                <Eye className="size-3.5" aria-hidden />
              </Link>
            ) : null}
            {canEdit && isLatestVersion ? (
              <button
                type="button"
                onClick={startEditing}
                aria-label={showDraft ? "Continue editing" : "Edit skill"}
                title={showDraft ? "Continue editing" : "Edit skill"}
                className={actionIconButtonClass}
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                disabled={forking}
                onClick={() => void forkAndEdit()}
                aria-label={forking ? "Forking…" : "Fork"}
                title={forking ? "Forking…" : "Fork"}
                className={`${actionIconButtonClass} text-muted hover:text-foreground`}
              >
                <GitForkIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {!canEdit && signedIn ? (
              <button
                type="button"
                disabled={forking}
                onClick={() => void forkAndEdit()}
                aria-label={forking ? "Forking…" : "Edit skill"}
                title={forking ? "Forking…" : "Edit skill"}
                className={actionIconButtonClass}
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {!canEdit && !signedIn ? (
              <Link
                href={loginHref}
                aria-label="Edit skill"
                title="Edit skill"
                className={actionIconButtonClass}
              >
                <Pencil className="size-3.5" aria-hidden />
              </Link>
            ) : null}
            {canDeleteCurrent ? (
              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteCurrentVersion()}
                aria-label={
                  deleting
                    ? "Deleting…"
                    : deletesWholeSkill
                      ? "Delete skill"
                      : `Delete version ${selectedVersionNumber}.0`
                }
                title={
                  deleting
                    ? "Deleting…"
                    : deletesWholeSkill
                      ? "Delete skill"
                      : `Delete version ${selectedVersionNumber}.0`
                }
                className={`${actionIconButtonClass} text-red-600`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
