import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { skills, skillVersions } from "@/lib/db/schema";

import type { Skill } from "./types";

export type {
  Skill,
  SkillOutputSection,
  SkillParameter,
  SkillScenario,
} from "./types";

/** Number of skeleton tiles to show while there is little/no real data yet. */
export const SKELETON_TILE_COUNT = 12;

const skillFields = {
  slug: skills.slug,
  name: skillVersions.name,
  summary: skillVersions.summary,
  description: skillVersions.description,
  usage: skillVersions.usage,
  parameters: skillVersions.parameters,
  exampleOutput: skillVersions.exampleOutput,
  scenarios: skillVersions.scenarios,
};

type SkillFieldsRow = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  usage: string;
  parameters: Skill["parameters"];
  exampleOutput: Skill["exampleOutput"];
  scenarios: Skill["scenarios"];
};

function toSkill(row: SkillFieldsRow): Skill {
  return {
    id: row.slug,
    name: row.name,
    summary: row.summary,
    description: row.description,
    usage: row.usage,
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
 * A single skill by its URL slug, resolved to the latest version the viewer is
 * allowed to see. Returns undefined if the skill has no visible version.
 */
export async function getSkill(
  slug: string,
  viewerUserId?: string | null,
): Promise<Skill | undefined> {
  const rows = await db
    .selectDistinctOn([skillVersions.skillId], skillFields)
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(and(eq(skills.slug, slug), visibleToViewer(viewerUserId)))
    .orderBy(skillVersions.skillId, desc(skillVersions.versionNumber))
    .limit(1);

  return rows[0] ? toSkill(rows[0]) : undefined;
}
