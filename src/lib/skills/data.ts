import { and, desc, eq, or } from "drizzle-orm";
import slugify from "slugify";

import { db } from "@/lib/db/client";
import { skills, skillVersions } from "@/lib/db/schema";

import type { Skill, SkillVersionHistoryItem } from "./types";

export type {
  Skill,
  SkillOutputSection,
  SkillParameter,
  SkillScenario,
  SkillVersionHistoryItem,
} from "./types";

/** How many markdown source lines to render in a library tile preview. */
export const SKILL_TILE_MARKDOWN_LINES = 12;

export function firstMarkdownLines(
  markdown: string,
  lineCount = SKILL_TILE_MARKDOWN_LINES,
): string {
  return markdown.split(/\r?\n/, lineCount).join("\n").trimEnd();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const skillFields = {
  id: skills.id,
  slug: skills.slug,
  name: skillVersions.name,
  summary: skillVersions.summary,
  description: skillVersions.description,
  usage: skillVersions.usage,
  thumbnailUrl: skillVersions.thumbnailUrl,
  parameters: skillVersions.parameters,
  exampleOutput: skillVersions.exampleOutput,
  scenarios: skillVersions.scenarios,
};

type SkillFieldsRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  usage: string;
  thumbnailUrl: string | null;
  parameters: Skill["parameters"];
  exampleOutput: Skill["exampleOutput"];
  scenarios: Skill["scenarios"];
};

function toSkill(row: SkillFieldsRow): Skill {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    description: row.description,
    usage: row.usage,
    thumbnailUrl: row.thumbnailUrl,
    parameters: row.parameters,
    exampleOutput: row.exampleOutput,
    scenarios: row.scenarios,
  };
}

/**
 * A version is visible to a viewer when it is public, or when the viewer owns
 * the skill (so they can see their own private versions).
 */
function visibleToViewer(viewerUserId?: string | null) {
  const isPublic = eq(skillVersions.visibility, "public");
  return viewerUserId
    ? or(isPublic, eq(skills.ownerUserId, viewerUserId))
    : isPublic;
}

/**
 * The Skill Library grid: one row per skill lineage, showing the latest version
 * the viewer is allowed to see. Skills with no visible version are omitted.
 */
export async function getSkills(viewerUserId?: string | null): Promise<Skill[]> {
  const rows = await db
    .selectDistinctOn([skillVersions.skillId], skillFields)
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(visibleToViewer(viewerUserId))
    .orderBy(skillVersions.skillId, desc(skillVersions.versionNumber));

  return rows.map(toSkill);
}

/**
 * A single skill by lineage UUID (preferred) or legacy slug, resolved to the
 * latest version the viewer is allowed to see.
 */
export async function getSkill(
  idOrSlug: string,
  viewerUserId?: string | null,
): Promise<Skill | undefined> {
  const byId = UUID_RE.test(idOrSlug)
    ? eq(skills.id, idOrSlug)
    : eq(skills.slug, idOrSlug);

  const rows = await db
    .selectDistinctOn([skillVersions.skillId], skillFields)
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(and(byId, visibleToViewer(viewerUserId)))
    .orderBy(skillVersions.skillId, desc(skillVersions.versionNumber))
    .limit(1);

  return rows[0] ? toSkill(rows[0]) : undefined;
}

/**
 * Visible versions for a skill lineage, oldest → newest (timeline order).
 * `changeSummary` is always null until that column/API exists.
 */
export async function getSkillVersions(
  idOrSlug: string,
  viewerUserId?: string | null,
): Promise<SkillVersionHistoryItem[]> {
  const byId = UUID_RE.test(idOrSlug)
    ? eq(skills.id, idOrSlug)
    : eq(skills.slug, idOrSlug);

  const rows = await db
    .select({
      id: skillVersions.id,
      versionNumber: skillVersions.versionNumber,
      createdAt: skillVersions.createdAt,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(and(byId, visibleToViewer(viewerUserId)))
    .orderBy(skillVersions.versionNumber);

  return rows.map((row) => ({
    id: row.id,
    versionNumber: row.versionNumber,
    createdAt: row.createdAt,
    changeSummary: null,
  }));
}

function summaryFromMarkdown(markdown: string): string {
  const plain = markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[`*_>~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "Uploaded Markdown skill.";
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base, { lower: true, strict: true }) || "skill";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(eq(skills.slug, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Create a new skill lineage + v1 from an uploaded Markdown file.
 * Visibility defaults to private; body is stored as description.
 */
export async function createSkillFromMarkdown(input: {
  name: string;
  markdown: string;
  ownerUserId: string;
}): Promise<Skill> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");
  if (!input.markdown.trim()) throw new Error("Markdown content is required.");

  const slug = await uniqueSlug(name);
  const summary = summaryFromMarkdown(input.markdown);

  const [skill] = await db
    .insert(skills)
    .values({ slug, ownerUserId: input.ownerUserId })
    .returning({ id: skills.id });

  await db.insert(skillVersions).values({
    skillId: skill.id,
    versionNumber: 1,
    name,
    summary,
    description: input.markdown,
    usage: "",
    parameters: [],
    exampleOutput: { title: "", items: [] },
    scenarios: [],
    visibility: "private",
    authorUserId: input.ownerUserId,
  });

  return {
    id: skill.id,
    name,
    summary,
    description: input.markdown,
    usage: "",
    thumbnailUrl: null,
    parameters: [],
    exampleOutput: { title: "", items: [] },
    scenarios: [],
  };
}
