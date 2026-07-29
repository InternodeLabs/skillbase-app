"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/MarkdownContent";
import { ForwardRefEditor } from "@/components/mdx/ForwardRefEditor";
import { VersionHistoryFloatover } from "@/components/VersionHistoryFloatover";
import type { VersionHistoryEntry } from "@/components/VersionHistoryFloatover";
import { composeSkillMarkdown } from "@/lib/skills/markdown";
import type { Skill } from "@/lib/skills/types";

const AUTOSAVE_MS = 800;

type DraftStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function SkillDetailPanel({
  skill,
  versions,
  selectedVersionId,
  selectedVersionNumber,
  isLatestVersion,
  liveVersionCount,
  initialEditing = false,
  loginHref,
  signedIn,
  canEdit,
}: {
  skill: Skill;
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
  selectedVersionNumber: number;
  isLatestVersion: boolean;
  liveVersionCount: number;
  initialEditing?: boolean;
  loginHref: string;
  signedIn: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const editorRef = useRef<MDXEditorMethods>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftRef = useRef("");

  const publishedMarkdown = useMemo(() => composeSkillMarkdown(skill), [skill]);
  const hasUnpublishedDraft = Boolean(skill.draftMarkdown?.trim());
  const showDraft =
    canEdit && isLatestVersion && hasUnpublishedDraft;
  const initialEditorMarkdown = showDraft
    ? (skill.draftMarkdown as string)
    : publishedMarkdown;
  // Owners with a draft should still see their work after reload (not the last publish).
  const viewMarkdown = showDraft
    ? (skill.draftMarkdown as string)
    : publishedMarkdown;

  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState(initialEditorMarkdown);
  const [publishing, setPublishing] = useState(false);
  const [forking, setForking] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(
    showDraft ? "saved" : "idle",
  );

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!initialEditing) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("edit")) return;
    url.searchParams.delete("edit");
    const next = url.searchParams.toString();
    window.history.replaceState(
      null,
      "",
      next ? `${url.pathname}?${next}` : url.pathname,
    );
  }, [initialEditing]);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  const persistDraft = useCallback(
    async (markdown: string) => {
      if (!canEdit) return;
      setDraftStatus("saving");
      try {
        const response = await fetch(`/api/skills/${skill.id}/draft`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markdown }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Draft save failed.");
        }
        if (latestDraftRef.current === markdown) {
          setDraftStatus("saved");
        }
      } catch {
        setDraftStatus("error");
        toast.error("Could not save draft. Your latest changes may be unsaved.");
      }
    },
    [canEdit, skill.id],
  );

  const queueAutosave = useCallback(
    (markdown: string) => {
      if (!canEdit) return;
      setDraftStatus("dirty");
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void persistDraft(markdown);
      }, AUTOSAVE_MS);
    },
    [canEdit, persistDraft],
  );

  const startEditing = useCallback(() => {
    if (!isLatestVersion) {
      router.push(`/skills/${skill.id}`);
      return;
    }
    const next = skill.draftMarkdown?.trim()
      ? skill.draftMarkdown
      : publishedMarkdown;
    setDraft(next);
    setDraftStatus(skill.draftMarkdown?.trim() ? "saved" : "idle");
    setEditing(true);
  }, [isLatestVersion, publishedMarkdown, router, skill.draftMarkdown, skill.id]);

  const forkAndEdit = useCallback(async () => {
    if (forking) return;
    setForking(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: selectedVersionNumber }),
      });
      const data = (await response.json()) as {
        skill?: { id: string };
        error?: string;
      };
      if (!response.ok || !data.skill?.id) {
        throw new Error(data.error || "Could not fork skill.");
      }
      toast.success("Forked — opened your new copy.");
      router.push(`/skills/${data.skill.id}?edit=1`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not fork skill.",
      );
      setForking(false);
    }
  }, [forking, router, selectedVersionNumber, skill.id]);

  const stopEditing = useCallback(async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    const markdown = editorRef.current?.getMarkdown() ?? draft;
    if (canEdit) {
      await persistDraft(markdown);
    }
    setEditing(false);
    router.refresh();
  }, [canEdit, draft, persistDraft, router]);

  const discardDraft = useCallback(async () => {
    if (!canEdit) return;
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    try {
      const response = await fetch(`/api/skills/${skill.id}/draft`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Could not discard draft.");
      }
      setDraft(publishedMarkdown);
      setDraftStatus("idle");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not discard draft.",
      );
    }
  }, [canEdit, publishedMarkdown, router, skill.id]);

  const publishVersion = useCallback(async () => {
    const markdown = (editorRef.current?.getMarkdown() ?? draft).trim();
    if (!markdown) {
      toast.error("Markdown content can’t be empty.");
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }

    setPublishing(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || "Could not publish version.");
        setPublishing(false);
        return;
      }

      toast.success("Published as a new version.");
      setDraftStatus("idle");
      setEditing(false);
      setPublishing(false);
      router.refresh();
    } catch {
      toast.error("Could not publish version.");
      setPublishing(false);
    }
  }, [draft, router, skill.id]);

  const draftStatusLabel =
    draftStatus === "saving" || draftStatus === "dirty"
      ? "Saving draft…"
      : draftStatus === "saved"
        ? "Draft saved"
        : draftStatus === "error"
          ? "Draft save failed"
          : null;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-6 pb-1">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-h-5 min-w-0 flex-1 flex-wrap items-center gap-2 text-xs font-medium">
          {skill.forkedFrom ? (
            skill.forkedFrom.accessible ? (
              <Link
                href={`/skills/${skill.forkedFrom.skillId}?v=${skill.forkedFrom.versionNumber}`}
                className="rounded-md bg-skeleton px-2 py-1 text-foreground transition hover:bg-background"
              >
                Forked from {skill.forkedFrom.skillName} v
                {skill.forkedFrom.versionNumber}.0
              </Link>
            ) : (
              <span className="rounded-md bg-skeleton px-2 py-1 text-muted">
                Forked from a private skill
              </span>
            )
          ) : null}
          {!editing && !isLatestVersion ? (
            <span className="rounded-md bg-skeleton px-2 py-1 text-foreground">
              Viewing version {selectedVersionNumber}.0
            </span>
          ) : null}
          {!editing && isLatestVersion && showDraft ? (
            <span className="rounded-md bg-skeleton px-2 py-1 text-foreground">
              Unpublished draft — not in version history yet
            </span>
          ) : null}
        </div>
        <VersionHistoryFloatover
          skillId={skill.id}
          skillName={skill.name}
          versions={versions}
          selectedVersionId={selectedVersionId}
          selectedVersionNumber={selectedVersionNumber}
          liveVersionCount={liveVersionCount}
          canEdit={canEdit}
        />
      </div>

      {editing ? (
        <div className="skill-mdx-editor min-h-80">
          <ForwardRefEditor
            key={skill.id}
            ref={editorRef}
            markdown={initialEditorMarkdown}
            onChange={(value) => {
              setDraft(value);
              queueAutosave(value);
            }}
            contentEditableClassName="markdown-preview text-sm leading-relaxed text-foreground outline-none"
            placeholder="Write the skill markdown… Type / for blocks"
          />
          
        </div>
      ) : (
        <MarkdownContent className="markdown-preview text-sm leading-relaxed text-foreground">
          {viewMarkdown}
        </MarkdownContent>
      )}
      <div className="h-10 pb-10" />
      <div className="sticky bottom-0 z-10 -mx-6 mt-auto border-t border-border bg-surface/95 px-6 pt-4 pb-3.5 backdrop-blur-sm">
        {editing ? (
          <div className="flex items-center gap-3">
            <p
              className={`min-w-0 flex-1 truncate text-sm font-medium ${
                draftStatus === "error" ? "text-red-600" : "text-muted"
              }`}
            >
              {draftStatusLabel ?? "\u00a0"}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={publishing || !canEdit}
                onClick={() => void publishVersion()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {publishing ? "Publishing…" : "Publish version"}
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    disabled={publishing}
                    aria-label="More editing actions"
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-background disabled:opacity-40"
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
          <div className="flex justify-center gap-2">
            {canEdit && !isLatestVersion ? (
              <Link
                href={`/skills/${skill.id}`}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
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
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
              >
                Edit skill
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
