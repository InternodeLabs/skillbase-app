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
  loginHref,
  signedIn,
  canEdit,
}: {
  skill: Skill;
  versions: VersionHistoryEntry[];
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
  const initialEditorMarkdown = hasUnpublishedDraft
    ? (skill.draftMarkdown as string)
    : publishedMarkdown;
  // Owners with a draft should still see their work after reload (not the last publish).
  const viewMarkdown =
    canEdit && hasUnpublishedDraft
      ? (skill.draftMarkdown as string)
      : publishedMarkdown;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialEditorMarkdown);
  const [publishing, setPublishing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(
    hasUnpublishedDraft ? "saved" : "idle",
  );

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

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
    const next = skill.draftMarkdown?.trim()
      ? skill.draftMarkdown
      : publishedMarkdown;
    setDraft(next);
    setDraftStatus(skill.draftMarkdown?.trim() ? "saved" : "idle");
    setEditing(true);
  }, [publishedMarkdown, skill.draftMarkdown]);

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
        <div className="min-h-5 text-xs font-medium">
          {!editing && hasUnpublishedDraft && canEdit ? (
            <span className="rounded-md bg-skeleton px-2 py-1 text-foreground">
              Unpublished draft — not in version history yet
            </span>
          ) : null}
        </div>
        <VersionHistoryFloatover skillName={skill.name} versions={versions} />
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
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            {signedIn ? (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
              >
                {hasUnpublishedDraft && canEdit
                  ? "Continue editing"
                  : "Edit skill"}
              </button>
            ) : (
              <Link
                href={loginHref}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
              >
                Edit skill
              </Link>
            )}
          </div>
        )}
        {editing && !canEdit ? (
          <p className="mt-2 text-center text-xs text-muted">
            Only the skill owner can save drafts or publish versions.
          </p>
        ) : null}
      </div>
    </section>
  );
}
