"use client";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { EllipsisVertical, Share2, Trash2 } from "lucide-react";
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
import {
  applyMarkdownParams,
  composeSkillMarkdown,
} from "@/lib/skills/markdown";
import type { Skill, SkillVisibility } from "@/lib/skills/types";

const AUTOSAVE_MS = 800;

type DraftStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type SkillOwner = {
  name: string | null;
  image: string | null;
  isViewer: boolean;
};

function ownerInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function VisibilityChip({
  visibility,
  interactive,
  disabled,
  onToggle,
}: {
  visibility: SkillVisibility;
  interactive: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}) {
  const label = visibility === "public" ? "Public" : "Private";
  const className =
    "rounded-md bg-skeleton px-2 py-1 text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40";

  if (!interactive || !onToggle) {
    return <span className="rounded-md bg-skeleton px-2 py-1 text-muted">{label}</span>;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      title={
        visibility === "public"
          ? "Currently public — click to make private"
          : "Currently private — click to make public"
      }
      className={className}
    >
      {label}
    </button>
  );
}

function ShareMenuSwitch({
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
    <DropdownMenu.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      onSelect={(event) => event.preventDefault()}
      className="flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2 outline-none data-highlighted:bg-background"
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
    </DropdownMenu.CheckboxItem>
  );
}

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
  owner = null,
  templateParams = {},
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
  /** Portal-resolved skill owner for attribution. Null when unresolved. */
  owner?: SkillOwner | null;
  /** URL query values used to fill `{{name}}` placeholders when viewing. */
  templateParams?: Record<string, string>;
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
  // Template params apply to the read view only — edit keeps raw `{{placeholders}}`.
  const viewMarkdown = applyMarkdownParams(
    showDraft ? (skill.draftMarkdown as string) : publishedMarkdown,
    templateParams,
  );

  const currentVisibility: SkillVisibility = skill.visibility ?? "private";
  const [editing, setEditing] = useState(initialEditing);
  const [draft, setDraft] = useState(initialEditorMarkdown);
  const [publishVisibility, setPublishVisibility] =
    useState<SkillVisibility>(currentVisibility);
  const [publishing, setPublishing] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [forking, setForking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareForAgent, setShareForAgent] = useState(false);
  const [shareLockedVersion, setShareLockedVersion] = useState(
    !isLatestVersion,
  );
  const [draftStatus, setDraftStatus] = useState<DraftStatus>(
    showDraft ? "saved" : "idle",
  );

  // Reset version/visibility-derived state during render when the underlying
  // prop changes (React's "adjust state while rendering" pattern) rather than in
  // an effect, which would trigger an extra render pass.
  const versionKey = `${isLatestVersion}:${selectedVersionNumber}`;
  const [prevVersionKey, setPrevVersionKey] = useState(versionKey);
  if (versionKey !== prevVersionKey) {
    setPrevVersionKey(versionKey);
    setShareLockedVersion(!isLatestVersion);
  }

  const [prevVisibility, setPrevVisibility] = useState(currentVisibility);
  if (currentVisibility !== prevVisibility) {
    setPrevVisibility(currentVisibility);
    setPublishVisibility(currentVisibility);
  }

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
    setPublishVisibility(currentVisibility);
    setDraftStatus(skill.draftMarkdown?.trim() ? "saved" : "idle");
    setEditing(true);
  }, [
    currentVisibility,
    isLatestVersion,
    publishedMarkdown,
    router,
    skill.draftMarkdown,
    skill.id,
  ]);

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

  const toggleLatestVisibility = useCallback(async () => {
    if (!canEdit || !isLatestVersion || updatingVisibility) return;
    const next: SkillVisibility =
      currentVisibility === "public" ? "private" : "public";
    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not update visibility.");
      }
      toast.success(next === "public" ? "Made public." : "Made private.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update visibility.",
      );
    } finally {
      setUpdatingVisibility(false);
    }
  }, [
    canEdit,
    currentVisibility,
    isLatestVersion,
    router,
    skill.id,
    updatingVisibility,
  ]);

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
        body: JSON.stringify({ markdown, visibility: publishVisibility }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || "Could not publish version.");
        setPublishing(false);
        return;
      }

      toast.success(
        publishVisibility === "public"
          ? "Published as a public version."
          : "Published as a private version.",
      );
      setDraftStatus("idle");
      setEditing(false);
      setPublishing(false);
      router.refresh();
    } catch {
      toast.error("Could not publish version.");
      setPublishing(false);
    }
  }, [draft, publishVisibility, router, skill.id]);

  const draftStatusLabel =
    draftStatus === "saving" || draftStatus === "dirty"
      ? "Saving draft…"
      : draftStatus === "saved"
        ? "Draft saved"
        : draftStatus === "error"
          ? "Draft save failed"
          : null;

  const copyShareLink = useCallback(async () => {
    const params = new URLSearchParams();
    if (shareLockedVersion) params.set("v", String(selectedVersionNumber));
    if (shareForAgent) params.set("raw", "1");
    const query = params.toString();
    const path = query
      ? `/skills/${skill.id}?${query}`
      : `/skills/${skill.id}`;
    const url =
      typeof window === "undefined"
        ? path
        : new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      const versionLabel = shareLockedVersion
        ? `version ${selectedVersionNumber}.0`
        : "latest version";
      toast.success(
        shareForAgent
          ? `Copied agent link (${versionLabel}).`
          : `Copied link (${versionLabel}).`,
      );
    } catch {
      toast.error("Could not copy link.");
    }
  }, [
    selectedVersionNumber,
    shareForAgent,
    shareLockedVersion,
    skill.id,
  ]);

  // The version currently on screen — used to gate/label the delete action.
  const currentVersionEntry = versions.find(
    (version) => version.versionNumber === selectedVersionNumber,
  );
  const deletesWholeSkill = liveVersionCount <= 1;
  const canDeleteCurrent =
    canEdit &&
    Boolean(currentVersionEntry) &&
    !currentVersionEntry?.deleted &&
    !currentVersionEntry?.isForked;

  const deleteCurrentVersion = useCallback(async () => {
    if (deleting) return;
    if (
      deletesWholeSkill &&
      !window.confirm(
        "Delete this skill? This removes its only version and it will no longer appear in the library.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/skills/${skill.id}/versions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: selectedVersionNumber }),
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
          !version.deleted && version.versionNumber !== selectedVersionNumber,
      );
      if (remainingLive.length === 0) {
        toast.success("Skill deleted");
        router.push("/");
        return;
      }

      const newLatest =
        remainingLive[remainingLive.length - 1]?.versionNumber ?? null;
      const redirectTo = data.redirectToVersionNumber;
      toast.success(`Version ${selectedVersionNumber}.0 deleted`);
      if (redirectTo == null || redirectTo === newLatest) {
        router.push(`/skills/${skill.id}`);
      } else {
        router.push(`/skills/${skill.id}?v=${redirectTo}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete version.",
      );
      setDeleting(false);
    }
  }, [
    deleting,
    deletesWholeSkill,
    router,
    selectedVersionNumber,
    skill.id,
    versions,
  ]);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-6 pb-1">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-h-5 min-w-0 flex-1 flex-wrap items-center gap-2 text-xs font-medium">
          {owner?.name ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-skeleton px-2 py-1 text-foreground"
              title={
                owner.isViewer ? "You own this skill" : `Owned by ${owner.name}`
              }
            >
              {owner.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={owner.image}
                  alt=""
                  className="size-4 rounded-full object-cover"
                />
              ) : (
                <span className="grid size-4 place-items-center rounded-full bg-background text-[0.6rem] font-semibold text-foreground">
                  {ownerInitials(owner.name)}
                </span>
              )}
              <span className="truncate">
                {owner.isViewer ? `${owner.name} (you)` : owner.name}
              </span>
            </span>
          ) : null}
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
          <VisibilityChip
            visibility={currentVisibility}
            interactive={canEdit && isLatestVersion && !editing}
            disabled={updatingVisibility}
            onToggle={() => void toggleLatestVisibility()}
          />
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
                className="inline-flex shrink-0 rounded-md border border-border p-0.5"
              >
                {(
                  [
                    ["private", "Private"],
                    ["public", "Public"],
                  ] as const
                ).map(([value, label]) => {
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
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5">
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
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Share skill link"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  <Share2 className="size-3.5" aria-hidden />
                  Share
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal >
                <DropdownMenu.Content
                  align="center"
                  sideOffset={6}
                  className="z-50 w-56 rounded-md border border-border bg-surface p-1 shadow-md"
                >
                  <ShareMenuSwitch
                    checked={shareForAgent}
                    onCheckedChange={setShareForAgent}
                    title="For Agent"
                    description={
                      shareForAgent
                        ? "Yes, return markdown"
                        : "No, opens to website"
                    }
                  />
                  <ShareMenuSwitch
                    checked={shareLockedVersion}
                    onCheckedChange={setShareLockedVersion}
                    title="Pinned"
                    description={
                      shareLockedVersion
                        ? `Yes, always version ${selectedVersionNumber}.0`
                        : "No, published version"
                    }
                  />
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                  <DropdownMenu.Item
                    onSelect={() => void copyShareLink()}
                    className="cursor-pointer rounded px-3 py-2 outline-none data-highlighted:bg-background"
                  >
                    <span className="block text-sm text-foreground">
                      Copy link
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {[
                        shareForAgent ? "Agent markdown" : "Website",
                        shareLockedVersion
                          ? `v${selectedVersionNumber}.0`
                          : "head",
                      ].join(" · ")}
                    </span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
            {canDeleteCurrent ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    disabled={deleting}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-background disabled:opacity-40"
                  >
                    <EllipsisVertical className="size-4" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-md"
                  >
                    <DropdownMenu.Item
                      disabled={deleting}
                      onSelect={() => void deleteCurrentVersion()}
                      className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-red-600 outline-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-background"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      {deletesWholeSkill
                        ? "Delete skill"
                        : `Delete version ${selectedVersionNumber}.0`}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
