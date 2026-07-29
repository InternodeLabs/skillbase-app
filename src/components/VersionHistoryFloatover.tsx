"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { History, X } from "lucide-react";
import { useMemo, useState } from "react";

export type VersionHistoryEntry = {
  id: string;
  versionNumber: number;
  /** ISO timestamp */
  createdAt: string;
  changeSummary: string | null;
};

function versionLabel(versionNumber: number): string {
  return `Version ${versionNumber}.0`;
}

function versionDateLabel(iso: string): string {
  return format(new Date(iso), "do MMMM");
}

function VersionTimeline({
  versions,
  selectedVersionId,
}: {
  versions: VersionHistoryEntry[];
  selectedVersionId: string | null;
}) {
  if (versions.length === 0) {
    return <p className="px-4 py-8 text-sm text-muted">No versions yet.</p>;
  }

  return (
    <ol className="relative flex-1 space-y-0 overflow-y-auto px-4 py-5">
      <span
        aria-hidden
        className="absolute top-5 bottom-5 left-[1.375rem] w-px bg-border"
      />

      {versions.map((version, index) => {
        const isSelected = version.id === selectedVersionId;
        const next = versions[index + 1];
        const showDelta = Boolean(next?.changeSummary);

        return (
          <li key={version.id}>
            <div
              className={`relative flex items-center gap-3 rounded-md py-2.5 pr-2 pl-1 ${
                isSelected ? "bg-skeleton/70" : ""
              }`}
            >
              <span
                aria-hidden
                className="relative z-10 ml-1.5 h-3.5 w-3.5 shrink-0 rounded-[3px] bg-muted"
              />
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {versionLabel(version.versionNumber)}
                </span>
                <time
                  dateTime={version.createdAt}
                  className="shrink-0 text-sm text-muted"
                >
                  {versionDateLabel(version.createdAt)}
                </time>
              </div>
            </div>

            {showDelta && next?.changeSummary ? (
              <div className="relative flex items-start gap-3 py-3 pr-2 pl-1">
                <span
                  aria-hidden
                  className="relative z-10 ml-[0.55rem] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-border bg-surface"
                />
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
                  {next.changeSummary}
                </p>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function VersionHistoryFloatover({
  skillName,
  versions,
}: {
  skillName: string;
  versions: VersionHistoryEntry[];
}) {
  const [open, setOpen] = useState(false);
  const latest = versions[versions.length - 1] ?? null;
  const selectedVersionId = latest?.id ?? null;
  const triggerLabel = useMemo(
    () => (latest ? versionLabel(latest.versionNumber) : "Version history"),
    [latest],
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
        >
          <History className="h-3.5 w-3.5 text-muted" aria-hidden />
          {triggerLabel}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="panel-overlay fixed inset-0 z-40 bg-foreground/20" />
        <Dialog.Content className="panel-slide-right fixed inset-y-0 right-0 z-50 flex w-[min(100%,24rem)] flex-col overflow-hidden border-l border-border bg-surface shadow-xl focus:outline-none">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded-md bg-skeleton"
            />
            <Dialog.Title className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {skillName}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Version history for this skill
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close version history"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <VersionTimeline
            versions={versions}
            selectedVersionId={selectedVersionId}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
