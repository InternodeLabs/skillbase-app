"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  dataTransferHasFiles,
  isMarkdownDataTransfer,
  isMarkdownFile,
  nameFromFilename,
  redactEmails,
} from "@/lib/skills/markdown-file";
import { skillSlugFromName } from "@/lib/skills/slug";
import type { SkillVisibility } from "@/lib/skills/types";
import { cn } from "@/lib/utils";

const MD_ERROR = "Please choose a Markdown file (.md).";

type PendingUpload = {
  name: string;
  markdown: string;
  filename: string;
  visibility: SkillVisibility;
};

/**
 * Page-level .md drop upload for the signed-in owner on their `/{username}`
 * profile. Visibility follows the active Public / Private tab.
 */
export function ProfileSkillDropZone({
  existingSlugs,
  currentVisibility,
  children,
}: {
  /** Slugs already owned by this user (conflict check). */
  existingSlugs: string[];
  currentVisibility: SkillVisibility;
  children: ReactNode;
}) {
  const router = useRouter();
  const nameInputId = useId();
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragInvalid, setDragInvalid] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [conflictName, setConflictName] = useState("");
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slugSet = useRef(new Set(existingSlugs));
  const visibilityRef = useRef(currentVisibility);

  useEffect(() => {
    slugSet.current = new Set(existingSlugs);
  }, [existingSlugs]);

  useEffect(() => {
    visibilityRef.current = currentVisibility;
  }, [currentVisibility]);

  const clearDrag = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
    setDragInvalid(false);
  }, []);

  const isNameTaken = useCallback((name: string) => {
    return slugSet.current.has(skillSlugFromName(name));
  }, []);

  const uploadSkill = useCallback(
    async (input: PendingUpload) => {
      setSubmitting(true);
      try {
        const response = await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name.trim(),
            markdown: input.markdown,
            visibility: input.visibility,
          }),
        });
        const data = (await response.json()) as {
          skill?: { id: string; slug?: string };
          error?: string;
          code?: string;
        };

        if (!response.ok || !data.skill?.id) {
          if (data.code === "USERNAME_REQUIRED") {
            toast.error("Choose a username before uploading a skill.");
          } else {
            toast.error(data.error || "Upload failed. Try again.");
          }
          setSubmitting(false);
          return false;
        }

        if (data.skill.slug) {
          slugSet.current.add(data.skill.slug);
        }

        toast.success(
          input.visibility === "public"
            ? "Skill uploaded as public"
            : "Skill uploaded as private",
        );
        setPending(null);
        setConflictError(null);
        setSubmitting(false);
        router.refresh();
        return true;
      } catch {
        toast.error("Upload failed. Try again.");
        setSubmitting(false);
        return false;
      }
    },
    [router],
  );

  const beginUpload = useCallback(
    async (file: File) => {
      if (!isMarkdownFile(file)) {
        toast.error(MD_ERROR);
        return;
      }

      let markdown: string;
      try {
        markdown = redactEmails(await file.text());
      } catch {
        toast.error("Could not read that file. Try again.");
        return;
      }

      if (!markdown.trim()) {
        toast.error("That Markdown file is empty.");
        return;
      }

      const name = nameFromFilename(file.name) || "Untitled skill";
      const next: PendingUpload = {
        name,
        markdown,
        filename: file.name,
        visibility: visibilityRef.current,
      };

      if (isNameTaken(name)) {
        setPending(next);
        setConflictName(name);
        setConflictError(
          `You already have a skill named “${name}”. Choose a different name.`,
        );
        return;
      }

      await uploadSkill(next);
    },
    [isNameTaken, uploadSkill],
  );

  useEffect(() => {
    function onDragEnter(event: globalThis.DragEvent) {
      if (!event.dataTransfer || !dataTransferHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
      setDragInvalid(isMarkdownDataTransfer(event.dataTransfer) === false);
    }

    function onDragOver(event: globalThis.DragEvent) {
      if (!event.dataTransfer || !dataTransferHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDragInvalid(isMarkdownDataTransfer(event.dataTransfer) === false);
    }

    function onDragLeave(event: globalThis.DragEvent) {
      if (!event.dataTransfer || !dataTransferHasFiles(event.dataTransfer)) {
        return;
      }
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) clearDrag();
    }

    function onDrop(event: globalThis.DragEvent) {
      if (!event.dataTransfer || !dataTransferHasFiles(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      clearDrag();
      if (file) void beginUpload(file);
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [beginUpload, clearDrag]);

  async function confirmRenamedUpload() {
    if (!pending || submitting) return;
    const name = conflictName.trim();
    if (!name) {
      setConflictError("Enter a name for this skill.");
      return;
    }
    if (isNameTaken(name)) {
      setConflictError(
        `You already have a skill named “${name}”. Choose a different name.`,
      );
      return;
    }
    await uploadSkill({ ...pending, name });
  }

  const visibilityLabel =
    currentVisibility === "public" ? "public" : "private";

  return (
    <>
      {children}

      {dragging ? (
        <div
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 p-4 sm:p-8"
          aria-hidden
        >
          <div
            className={cn(
              "flex min-h-48 w-full max-w-md flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center shadow-lg",
              dragInvalid
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-accent bg-surface text-foreground",
            )}
          >
            <FileUp className="h-8 w-8" aria-hidden />
            <div>
              <p className="text-sm font-semibold">
                {dragInvalid
                  ? "Only Markdown files are supported"
                  : `Drop to save as ${visibilityLabel}`}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  dragInvalid ? "text-red-600" : "text-muted",
                )}
              >
                {dragInvalid
                  ? "Drop will be rejected · .md required"
                  : `Uploads to your ${visibilityLabel} skills`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (submitting) return;
          if (!open) {
            setPending(null);
            setConflictError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface shadow-xl focus:outline-none">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <Dialog.Title className="text-base font-semibold tracking-tight">
                  Name already in use
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted">
                  Choose a new name before uploading as {visibilityLabel}.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={submitting}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-background hover:text-foreground disabled:opacity-40"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4 px-5 py-4">
              {pending?.filename ? (
                <p className="text-xs text-muted">From {pending.filename}</p>
              ) : null}
              <div>
                <label
                  htmlFor={nameInputId}
                  className="text-xs font-medium tracking-wide text-muted uppercase"
                >
                  Skill name
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  value={conflictName}
                  onChange={(event) => {
                    setConflictName(event.target.value);
                    setConflictError(null);
                  }}
                  disabled={submitting}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void confirmRenamedUpload();
                    }
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
              {conflictError ? (
                <p className="text-sm text-red-600" role="alert">
                  {conflictError}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={submitting}
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-40"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={!conflictName.trim() || submitting}
                onClick={() => void confirmRenamedUpload()}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Uploading…" : "Upload"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
