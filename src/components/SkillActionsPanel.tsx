"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CopyIcon, Download, EllipsisVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSkillDetail } from "@/components/SkillDetailContext";
import type { SkillVisibility } from "@/lib/skills/types";

function buildSharePath(
  skillId: string,
  selectedVersionNumber: number,
  shareForAgent: boolean,
  shareLockedVersion: boolean,
): string {
  const params = new URLSearchParams();
  if (shareLockedVersion) params.set("v", String(selectedVersionNumber));
  if (shareForAgent) params.set("raw", "1");
  const query = params.toString();
  return query ? `/skills/${skillId}?${query}` : `/skills/${skillId}`;
}

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

function ShareSwitch({
  checked,
  onCheckedChange,
  title,
  description,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded px-1 py-1.5 text-left outline-none"
    >
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-md transition ${
          checked ? "bg-accent" : "bg-skeleton"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-sm bg-surface transition ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
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
    shareForAgent,
    setShareForAgent,
    shareLockedVersion,
    setShareLockedVersion,
    canDeleteCurrent,
    deletesWholeSkill,
    startEditing,
    stopEditing,
    discardDraft,
    publishVersion,
    forkAndEdit,
    copyShareLink,
    deleteCurrentVersion,
  } = useSkillDetail();

  const sharePath = buildSharePath(
    skillId,
    selectedVersionNumber,
    shareForAgent,
    shareLockedVersion,
  );
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = origin
    ? new URL(sharePath, origin).toString()
    : sharePath;

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
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 border border-border rounded-md p-2">
            <div className=" flex items-center justify-between gap-2">
              <div>Use this link for your agent</div>
              <button
                type="button"
                onClick={() => void copyShareLink()}
                aria-label="Copy share link"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
              >
                <CopyIcon className="size-3.5" aria-hidden />
              </button>
            </div>
            <textarea
              readOnly
              value={shareUrl}
              className="mb-1 w-full bg-gray-50 resize-none rounded-md border border-border border-none outline-none"
            />
            <ShareSwitch
              checked={shareForAgent}
              onCheckedChange={setShareForAgent}
              title="For Agent"
              description={
                shareForAgent ? "Yes, return markdown" : "No, opens to website"
              }
            />
            <ShareSwitch
              checked={shareLockedVersion}
              onCheckedChange={setShareLockedVersion}
              title="Pinned"
              description={
                shareLockedVersion
                  ? `Yes, always version ${selectedVersionNumber}.0`
                  : "No, published version"
              }
            />
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </button>

          {canEdit && !isLatestVersion ? (
            <Link
              href={`/skills/${skillId}`}
              className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition hover:bg-background"
            >
              View latest
            </Link>
          ) : null}
          {canEdit && isLatestVersion ? (
            <button
              type="button"
              onClick={startEditing}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
            >
              {showDraft ? "Continue editing" : "Edit skill"}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              disabled={forking}
              onClick={() => void forkAndEdit()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted transition hover:bg-background hover:text-foreground disabled:opacity-40"
            >
              {forking ? "Forking…" : "Fork"}
            </button>
          ) : null}
          {!canEdit && signedIn ? (
            <button
              type="button"
              disabled={forking}
              onClick={() => void forkAndEdit()}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-40"
            >
              {forking ? "Forking…" : "Edit skill"}
            </button>
          ) : null}
          {!canEdit && !signedIn ? (
            <Link
              href={loginHref}
              className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-foreground transition hover:bg-background"
            >
              Edit skill
            </Link>
          ) : null}
          {canDeleteCurrent ? (
            <button
              type="button"
              disabled={deleting}
              onClick={() => void deleteCurrentVersion()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-background disabled:opacity-40"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {deleting
                ? "Deleting…"
                : deletesWholeSkill
                  ? "Delete skill"
                  : `Delete version ${selectedVersionNumber}.0`}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
