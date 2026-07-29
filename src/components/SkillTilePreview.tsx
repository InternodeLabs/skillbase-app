import { MarkdownContent } from "@/components/MarkdownContent";
import {
  firstMarkdownLines,
  type Skill,
} from "@/lib/skills/data";

export function SkillTilePreview({ skill }: { skill: Skill }) {
  if (skill.thumbnailUrl) {
    return (
      // External or future-uploaded URLs; plain img avoids next/image host config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={skill.thumbnailUrl}
        alt=""
        className="aspect-4/3 w-full object-cover"
      />
    );
  }

  return (
    <div className="relative aspect-4/3 overflow-hidden bg-surface">
      <div className="pointer-events-none p-3" aria-hidden>
        <MarkdownContent className="markdown-preview markdown-preview-tile text-[13px] leading-snug text-foreground">
          {firstMarkdownLines(skill.description)}
        </MarkdownContent>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface to-transparent" />
    </div>
  );
}
