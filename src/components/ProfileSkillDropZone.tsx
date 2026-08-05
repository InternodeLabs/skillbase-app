"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, Lock, Unlock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
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

export function ProfileSkillDropZone({
  existingSlugs,
  basePath,
  currentVisibility,
  children,
}: {
  /** Slugs already owned by this user (conflict check). */
  existingSlugs: string[];
  basePath: string;
  currentVisibility: SkillVisibility;
  children: ReactNode;
}) {
  const router = useRouter();
  const nameInputId = useId();
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragInvalid, setDragInvalid] = useState(false);
  const [hoverTarget, setHoverTarget] = useState<SkillVisibility | null>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [conflictName, setConflictName] = useState("");
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slugSet = useRef(new Set(existingSlugs));

  useEffect(() => {
    slugSet.current = new Set(existingSlugs);
  }, [existingSlugs]);

  const clearDrag = useCallback(() => {
    dragDepth.current = 0;
    setDragging(false);
    setDragInvalid(false);
    setHoverTarget(null);
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

        const nextPath =
          input.visibility === "private"
            ? `${basePath}?visibility=private`
            : basePath;
        if (
          (currentVisibility === "private") !==
          (input.visibility === "private")
        ) {
          router.replace(nextPath);
        }
        router.refresh();
        return true;
      } catch {
        toast.error("Upload failed. Try again.");
        setSubmitting(false);
        return false;
      }
    },
    [basePath, currentVisibility, router],
  );

  const beginUpload = useCallback(
    async (file: File, visibility: SkillVisibility) => {
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
        visibility,
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
      // Overlay handles real drops; clear page drag state if drop lands elsewhere.
      clearDrag();
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
  }, [clearDrag]);

  const onZoneDragOver = useCallback(
    (visibility: SkillVisibility) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setHoverTarget(visibility);
      setDragInvalid(isMarkdownDataTransfer(event.dataTransfer) === false);
    },
    [],
  );

  const onZoneDrop = useCallback(
    (visibility: SkillVisibility) => (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      clearDrag();
      const file = event.dataTransfer.files[0];
      if (file) void beginUpload(file, visibility);
    },
    [beginUpload, clearDrag],
  );

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

  return (
    <>
      {children}

      {dragging ? (
        <div
          className="fixed inset-0 z-40 flex items-stretch justify-center bg-foreground/40 p-4 sm:p-8"
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) {
              return;
            }
            clearDrag();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            clearDrag();
          }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 self-center sm:flex-row sm:gap-4">
            {dragInvalid ? (
              <div
                className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-500 bg-red-50 px-6 py-10 text-center text-red-700"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  clearDrag();
                  toast.error(MD_ERROR);
                }}
              >
                <FileUp className="h-8 w-8" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">
                    Only Markdown files are supported
                  </p>
                  <p className="mt-1 text-xs text-red-600">
                    Drop will be rejected · .md required
                  </p>
                </div>
              </div>
            ) : (
              <>
                <DropTarget
                  label="Public"
                  description="Anyone who visits your profile can see it"
                  icon={<Unlock className="h-5 w-5" aria-hidden />}
                  active={hoverTarget === "public"}
                  onDragEnter={onZoneDragOver("public")}
                  onDragOver={onZoneDragOver("public")}
                  onDrop={onZoneDrop("public")}
                />
                <DropTarget
                  label="Private"
                  description="Only you can see it"
                  icon={<Lock className="h-5 w-5" aria-hidden />}
                  active={hoverTarget === "private"}
                  onDragEnter={onZoneDragOver("private")}
                  onDragOver={onZoneDragOver("private")}
                  onDrop={onZoneDrop("private")}
                />
              </>
            )}
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
                  Choose a new name before uploading
                  {pending
                    ? ` as ${pending.visibility === "public" ? "public" : "private"}`
                    : ""}
                  .
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

function DropTarget({
  label,
  description,
  icon,
  active,
  onDragEnter,
  onDragOver,
  onDrop,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  active: boolean;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-surface px-6 py-10 text-center transition",
        active
          ? "border-accent bg-background shadow-lg"
          : "border-border text-foreground",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full",
          active ? "bg-accent text-accent-foreground" : "bg-background text-foreground",
        )}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">Drop to save as {label}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}
