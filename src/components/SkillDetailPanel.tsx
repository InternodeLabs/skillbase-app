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
    return (
      <span className="rounded-md bg-skeleton px-2 py-1 text-muted">{label}</span>
    );
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
      <div className="mb-4 flex min-h-5 min-w-0 flex-wrap items-center gap-2 text-xs font-medium">
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
