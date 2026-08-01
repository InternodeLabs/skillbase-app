"use client";

import Link from "next/link";

import { MarkdownContent } from "@/components/MarkdownContent";
import { useSkillDetail } from "@/components/SkillDetailContext";
import { ForwardRefEditor } from "@/components/mdx/ForwardRefEditor";
import { applyMarkdownParams } from "@/lib/skills/markdown";
import type { SkillVisibility } from "@/lib/skills/types";

function ownerInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function VisibilitySwitch({
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
  const isPublic = visibility === "public";
  const label = isPublic ? "Public" : "Private";

  if (!interactive || !onToggle) {
    return (
      <span className="inline-flex items-center gap-2 text-muted">
        <span>{label}</span>
        <span
          aria-hidden
          className={`relative h-5 w-9 shrink-0 rounded-md ${
            isPublic ? "bg-accent opacity-60" : "bg-skeleton"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 size-4 rounded-sm bg-surface ${
              isPublic ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPublic}
      aria-label={`Visibility: ${label}`}
      disabled={disabled}
      onClick={onToggle}
      title={
        isPublic
          ? "Currently public — click to make private"
          : "Currently private — click to make public"
      }
      className="inline-flex cursor-pointer items-center gap-2 text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-md transition ${
          isPublic ? "bg-accent" : "bg-skeleton"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-4 rounded-sm bg-surface transition ${
            isPublic ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

export function SkillDetailPanel() {
  const {
    skill,
    selectedVersionNumber,
    isLatestVersion,
    canEdit,
    owner,
    templateParams,
    editorRef,
    showDraft,
    viewMarkdownSource,
    initialEditorMarkdown,
    editing,
    setDraft,
    queueAutosave,
    updatingVisibility,
    currentVisibility,
    toggleLatestVisibility,
  } = useSkillDetail();

  const viewMarkdown = applyMarkdownParams(viewMarkdownSource, templateParams);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex min-h-5 min-w-0 flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
        <VisibilitySwitch
          visibility={currentVisibility}
          interactive={canEdit && isLatestVersion && !editing}
          disabled={updatingVisibility}
          onToggle={() => void toggleLatestVisibility()}
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
    </section>
  );
}
