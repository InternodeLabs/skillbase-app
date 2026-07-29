"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MarkdownContent } from "@/components/MarkdownContent";
import { FileUp, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";

const MD_ERROR = "Please choose a Markdown file (.md).";

function nameFromFilename(filename: string): string {
  return filename.replace(/\.(md|markdown|mdown|mkd)$/i, "").trim() || filename;
}

function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    name.endsWith(".mdown") ||
    name.endsWith(".mkd") ||
    file.type === "text/markdown" ||
    file.type === "text/x-markdown"
  );
}

/** During drag, infer whether the payload looks like Markdown. `null` = unknown. */
function isMarkdownDataTransfer(dataTransfer: DataTransfer): boolean | null {
  const items = Array.from(dataTransfer.items).filter(
    (item) => item.kind === "file",
  );
  if (items.length === 0) return null;

  const file = items[0]?.getAsFile();
  if (file?.name) return isMarkdownFile(file);

  const type = items[0]?.type ?? "";
  if (type === "text/markdown" || type === "text/x-markdown") return true;
  if (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type.startsWith("audio/") ||
    type === "application/pdf" ||
    type === "application/zip" ||
    type === "application/json" ||
    type.startsWith("application/")
  ) {
    return false;
  }

  return null;
}

export function UploadSkillButton() {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragInvalid, setDragInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clearDragState = useCallback(() => {
    setDragging(false);
    setDragInvalid(false);
  }, []);

  const reset = useCallback(() => {
    clearDragState();
    setError(null);
    setName("");
    setContent(null);
    setFilename(null);
    setSubmitting(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [clearDragState]);

  const updateDragState = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
    setDragInvalid(isMarkdownDataTransfer(event.dataTransfer) === false);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!isMarkdownFile(file)) {
      toast.error(MD_ERROR);
      return;
    }

    try {
      const text = await file.text();
      setError(null);
      setFilename(file.name);
      setName(nameFromFilename(file.name));
      setContent(text);
    } catch {
      setError("Could not read that file. Try again.");
    }
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      clearDragState();
      const file = event.dataTransfer.files[0];
      if (file) void loadFile(file);
    },
    [clearDragState, loadFile],
  );

  const onDropZoneKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const onUpload = useCallback(async () => {
    if (!content || !name.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), markdown: content }),
      });
      const data = (await response.json()) as {
        skill?: { id: string };
        error?: string;
      };

      if (!response.ok || !data.skill?.id) {
        setError(data.error || "Upload failed. Try again.");
        setSubmitting(false);
        return;
      }

      setOpen(false);
      reset();
      router.push(`/skills/${data.skill.id}`);
      router.refresh();
    } catch {
      setError("Upload failed. Try again.");
      setSubmitting(false);
    }
  }, [content, name, reset, router, submitting]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Upload skill"
          title="Upload skill"
          className="grid h-7 w-7 place-items-center rounded-md border border-border text-foreground transition hover:bg-background"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,40rem)] w-[min(100%-2rem,36rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Upload skill
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                Drop a Markdown file to preview it. The file name becomes the
                skill name.
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {content === null ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={onDropZoneKeyDown}
                onDragEnter={updateDragState}
                onDragOver={updateDragState}
                onDragLeave={(event) => {
                  event.preventDefault();
                  // Ignore leave events that stay inside the drop zone
                  // (e.g. moving over child elements).
                  if (event.currentTarget.contains(event.relatedTarget as Node)) {
                    return;
                  }
                  clearDragState();
                }}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition ${
                  dragInvalid
                    ? "border-red-500 bg-red-50 text-red-700"
                    : dragging
                      ? "border-accent bg-background"
                      : "border-border hover:border-accent/50 hover:bg-background/60"
                }`}
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full ${
                    dragInvalid
                      ? "bg-red-100 text-red-600"
                      : "bg-background text-foreground"
                  }`}
                >
                  <FileUp className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {dragInvalid
                      ? "Only Markdown files are supported"
                      : "Drag and drop a Markdown file"}
                  </p>
                  <p
                    className={`mt-1 text-xs ${dragInvalid ? "text-red-600" : "text-muted"}`}
                  >
                    {dragInvalid ? "Drop will be rejected · .md required" : "or click to browse · .md"}
                  </p>
                </div>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="file"
                  accept=".md,.markdown,.mdown,.mkd,text/markdown,text/x-markdown"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void loadFile(file);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor={`${inputId}-name`}
                    className="text-xs font-medium tracking-wide text-muted uppercase"
                  >
                    Name
                  </label>
                  <input
                    id={`${inputId}-name`}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={submitting}
                    className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                  {filename ? (
                    <p className="mt-1.5 text-xs text-muted">From {filename}</p>
                  ) : null}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">
                      Preview
                    </p>
                    <button
                      type="button"
                      onClick={reset}
                      disabled={submitting}
                      className="text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-40"
                    >
                      Choose another file
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background px-4 py-3">
                    <MarkdownContent>{content}</MarkdownContent>
                  </div>
                </div>
              </div>
            )}

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
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
              disabled={!content || !name.trim() || submitting}
              onClick={() => void onUpload()}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
