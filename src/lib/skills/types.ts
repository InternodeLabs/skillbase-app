export interface SkillParameter {
  name: string;
  description: string;
}

export interface SkillOutputSection {
  title: string;
  items: string[];
}

export interface SkillScenario {
  id: string;
  label: string;
}

export type SkillVisibility = "public" | "private";

/** The shape the UI renders. `id` is the skill lineage UUID (share URL). */
export interface Skill {
  id: string;
  /** Stable-ish file stem for `/{username}/{slug}.md` browse URLs. */
  slug: string;
  /** Owner's vanity username when claimed; used for browse URLs. */
  ownerUsername?: string | null;
  name: string;
  summary: string;
  description: string;
  usage: string;
  thumbnailUrl: string | null;
  parameters: SkillParameter[];
  exampleOutput: SkillOutputSection;
  scenarios: SkillScenario[];
  /** Present on detail fetches used for edit gating. */
  ownerUserId?: string;
  /** When the currently shown version was published. */
  updatedAt?: Date;
  /** Snapshot identity for the version currently shown. */
  versionId?: string;
  versionNumber?: number;
  /** Visibility of the version currently shown. */
  visibility?: SkillVisibility;
  /** Present when this skill lineage was forked from another version. */
  forkedFrom?: SkillForkOrigin | null;
  /** Owner-only unpublished edits. Null when none. */
  draftMarkdown?: string | null;
  draftUpdatedAt?: Date | null;
}

/** Where this skill branched from, if it is a fork. */
export interface SkillForkOrigin {
  skillId: string;
  slug: string;
  ownerUsername: string | null;
  skillName: string;
  versionNumber: number;
  /** Whether the viewer can open the source version. */
  accessible: boolean;
}

/** One append-only snapshot in a skill's version timeline. */
export interface SkillVersionHistoryItem {
  id: string;
  versionNumber: number;
  createdAt: Date;
  /** What changed since the prior version. Null until BE writes it. */
  changeSummary: string | null;
  /** Soft-deleted; shown as a tombstone in history. */
  deleted: boolean;
  /** True when another skill was forked from this version. */
  isForked: boolean;
  visibility: SkillVisibility;
}
