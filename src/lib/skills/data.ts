import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import slugify from "slugify";

import { db } from "@/lib/db/client";
import { skills, skillVersions } from "@/lib/db/schema";

import type { Skill, SkillForkOrigin, SkillVersionHistoryItem } from "./types";

export type {
  Skill,
  SkillForkOrigin,
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
  ownerUserId: skills.ownerUserId,
  forkedFromVersionId: skills.forkedFromVersionId,
  draftMarkdown: skills.draftMarkdown,
  draftUpdatedAt: skills.draftUpdatedAt,
  versionId: skillVersions.id,
  versionNumber: skillVersions.versionNumber,
  name: skillVersions.name,
  summary: skillVersions.summary,
  description: skillVersions.description,
  usage: skillVersions.usage,
  thumbnailUrl: skillVersions.thumbnailUrl,
  parameters: skillVersions.parameters,
  exampleOutput: skillVersions.exampleOutput,
  scenarios: skillVersions.scenarios,
  visibility: skillVersions.visibility,
};

type SkillFieldsRow = {
  id: string;
  slug: string;
  ownerUserId: string;
  forkedFromVersionId: string | null;
  draftMarkdown: string | null;
  draftUpdatedAt: Date | null;
  versionId: string;
  versionNumber: number;
  name: string;
  summary: string;
  description: string;
  usage: string;
  thumbnailUrl: string | null;
  parameters: Skill["parameters"];
  exampleOutput: Skill["exampleOutput"];
  scenarios: Skill["scenarios"];
  visibility: "public" | "private";
};

function toSkill(
  row: SkillFieldsRow,
  viewerUserId?: string | null,
  forkedFrom?: SkillForkOrigin | null,
): Skill {
  const isOwner = Boolean(viewerUserId && row.ownerUserId === viewerUserId);
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
    ownerUserId: row.ownerUserId,
    versionId: row.versionId,
    versionNumber: row.versionNumber,
    forkedFrom: forkedFrom ?? null,
    draftMarkdown: isOwner ? row.draftMarkdown : null,
    draftUpdatedAt: isOwner ? row.draftUpdatedAt : null,
  };
}

async function resolveForkOrigins(
  forkedFromVersionIds: Array<string | null | undefined>,
  viewerUserId?: string | null,
): Promise<Map<string, SkillForkOrigin>> {
  const ids = [
    ...new Set(
      forkedFromVersionIds.filter((id): id is string => Boolean(id)),
    ),
  ];
  if (ids.length === 0) return new Map();

  const origins = await db
    .select({
      versionId: skillVersions.id,
      skillId: skills.id,
      skillName: skillVersions.name,
      versionNumber: skillVersions.versionNumber,
      visibility: skillVersions.visibility,
      deletedAt: skillVersions.deletedAt,
      ownerUserId: skills.ownerUserId,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(inArray(skillVersions.id, ids));

  return new Map(
    origins.map((origin) => {
      const accessible =
        !origin.deletedAt &&
        (origin.visibility === "public" ||
          Boolean(viewerUserId && origin.ownerUserId === viewerUserId));
      return [
        origin.versionId,
        {
          skillId: origin.skillId,
          skillName: origin.skillName,
          versionNumber: origin.versionNumber,
          accessible,
        } satisfies SkillForkOrigin,
      ];
    }),
  );
}

async function resolveForkOrigin(
  forkedFromVersionId: string | null,
  viewerUserId?: string | null,
): Promise<SkillForkOrigin | null> {
  if (!forkedFromVersionId) return null;
  const map = await resolveForkOrigins([forkedFromVersionId], viewerUserId);
  return map.get(forkedFromVersionId) ?? null;
}

/**
 * A version is visible to a viewer when it is not deleted, and it is public
 * or the viewer owns the skill (so they can see their own private versions).
 */
function visibleToViewer(viewerUserId?: string | null) {
  const isPublic = eq(skillVersions.visibility, "public");
  const notDeleted = isNull(skillVersions.deletedAt);
  const visibility = viewerUserId
    ? or(isPublic, eq(skills.ownerUserId, viewerUserId))
    : isPublic;
  return and(notDeleted, visibility);
}

/**
 * The Skill Library grid: one row per skill lineage, showing the latest version
 * the viewer is allowed to see. Skills with no visible version are omitted.
 * Optional `query` filters by name / summary / description / usage (case-insensitive).
 */
export async function getSkills(
  viewerUserId?: string | null,
  options?: { query?: string },
): Promise<Skill[]> {
  const rows = await db
    .selectDistinctOn([skillVersions.skillId], skillFields)
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(visibleToViewer(viewerUserId))
    .orderBy(skillVersions.skillId, desc(skillVersions.versionNumber));

  const origins = await resolveForkOrigins(
    rows.map((row) => row.forkedFromVersionId),
    viewerUserId,
  );

  const list = rows.map((row) =>
    toSkill(
      row,
      viewerUserId,
      row.forkedFromVersionId
        ? (origins.get(row.forkedFromVersionId) ?? null)
        : null,
    ),
  );

  const query = options?.query?.trim().toLowerCase();
  if (!query) return list;

  return list.filter((skill) =>
    [skill.name, skill.summary, skill.description, skill.usage].some((field) =>
      field.toLowerCase().includes(query),
    ),
  );
}

export type SkillVersionLookup =
  | { status: "live"; skill: Skill }
  | {
      status: "deleted";
      /** Earlier live version to permanently redirect to, if any. */
      redirectToVersionNumber: number | null;
      skillId: string;
    }
  | { status: "missing" };

/**
 * Resolve a skill detail view, including soft-deleted `?v=N` redirects to an
 * earlier live version when possible.
 */
export async function lookupSkillVersion(
  idOrSlug: string,
  viewerUserId?: string | null,
  options?: { versionNumber?: number },
): Promise<SkillVersionLookup> {
  const skill = await getSkill(idOrSlug, viewerUserId, options);
  if (skill) return { status: "live", skill };

  if (options?.versionNumber == null) return { status: "missing" };

  const byId = UUID_RE.test(idOrSlug)
    ? eq(skills.id, idOrSlug)
    : eq(skills.slug, idOrSlug);

  const [tombstone] = await db
    .select({
      skillId: skills.id,
      ownerUserId: skills.ownerUserId,
      visibility: skillVersions.visibility,
      deletedAt: skillVersions.deletedAt,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(
      and(byId, eq(skillVersions.versionNumber, options.versionNumber)),
    )
    .limit(1);

  if (!tombstone?.deletedAt) return { status: "missing" };

  const canKnow =
    tombstone.visibility === "public" ||
    Boolean(viewerUserId && tombstone.ownerUserId === viewerUserId);
  if (!canKnow) return { status: "missing" };

  const [earlier] = await db
    .select({ versionNumber: skillVersions.versionNumber })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(
      and(
        eq(skills.id, tombstone.skillId),
        lt(skillVersions.versionNumber, options.versionNumber),
        visibleToViewer(viewerUserId),
      ),
    )
    .orderBy(desc(skillVersions.versionNumber))
    .limit(1);

  if (earlier) {
    return {
      status: "deleted",
      skillId: tombstone.skillId,
      redirectToVersionNumber: earlier.versionNumber,
    };
  }

  const [latest] = await db
    .select({ versionNumber: skillVersions.versionNumber })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(and(eq(skills.id, tombstone.skillId), visibleToViewer(viewerUserId)))
    .orderBy(desc(skillVersions.versionNumber))
    .limit(1);

  return {
    status: "deleted",
    skillId: tombstone.skillId,
    redirectToVersionNumber: latest?.versionNumber ?? null,
  };
}

/**
 * A single skill by lineage UUID (preferred) or legacy slug.
 * Defaults to the latest version the viewer may see; pass `versionNumber`
 * to load a specific visible snapshot.
 */
export async function getSkill(
  idOrSlug: string,
  viewerUserId?: string | null,
  options?: { versionNumber?: number },
): Promise<Skill | undefined> {
  const byId = UUID_RE.test(idOrSlug)
    ? eq(skills.id, idOrSlug)
    : eq(skills.slug, idOrSlug);

  if (options?.versionNumber != null) {
    const rows = await db
      .select(skillFields)
      .from(skillVersions)
      .innerJoin(skills, eq(skills.id, skillVersions.skillId))
      .where(
        and(
          byId,
          eq(skillVersions.versionNumber, options.versionNumber),
          visibleToViewer(viewerUserId),
        ),
      )
      .limit(1);
    if (!rows[0]) return undefined;
    return toSkill(
      rows[0],
      viewerUserId,
      await resolveForkOrigin(rows[0].forkedFromVersionId, viewerUserId),
    );
  }

  const rows = await db
    .selectDistinctOn([skillVersions.skillId], skillFields)
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(and(byId, visibleToViewer(viewerUserId)))
    .orderBy(skillVersions.skillId, desc(skillVersions.versionNumber))
    .limit(1);

  if (!rows[0]) return undefined;
  return toSkill(
    rows[0],
    viewerUserId,
    await resolveForkOrigin(rows[0].forkedFromVersionId, viewerUserId),
  );
}

/**
 * Visible versions for a skill lineage, oldest → newest (timeline order).
 * Owners also see soft-deleted tombstones. `changeSummary` is always null
 * until that column/API exists.
 */
export async function getSkillVersions(
  idOrSlug: string,
  viewerUserId?: string | null,
): Promise<SkillVersionHistoryItem[]> {
  const byId = UUID_RE.test(idOrSlug)
    ? eq(skills.id, idOrSlug)
    : eq(skills.slug, idOrSlug);

  const [lineage] = await db
    .select({ id: skills.id, ownerUserId: skills.ownerUserId })
    .from(skills)
    .where(byId)
    .limit(1);

  if (!lineage) return [];

  const isOwner = Boolean(viewerUserId && lineage.ownerUserId === viewerUserId);
  const visibility = viewerUserId
    ? or(
        eq(skillVersions.visibility, "public"),
        eq(skills.ownerUserId, viewerUserId),
      )
    : eq(skillVersions.visibility, "public");

  // Owners see deleted tombstones; everyone else only live versions.
  const where = isOwner
    ? and(eq(skills.id, lineage.id), visibility)
    : and(eq(skills.id, lineage.id), visibility, isNull(skillVersions.deletedAt));

  const rows = await db
    .select({
      id: skillVersions.id,
      versionNumber: skillVersions.versionNumber,
      createdAt: skillVersions.createdAt,
      deletedAt: skillVersions.deletedAt,
      isForked: sql<boolean>`exists (
        select 1 from skill as fork
        where fork.forked_from_version_id = ${skillVersions.id}
      )`,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(where)
    .orderBy(skillVersions.versionNumber);

  return rows.map((row) => ({
    id: row.id,
    versionNumber: row.versionNumber,
    createdAt: row.createdAt,
    changeSummary: null,
    deleted: Boolean(row.deletedAt),
    isForked: Boolean(row.isForked),
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
    ownerUserId: input.ownerUserId,
  };
}

/**
 * Fork a visible skill version into a new lineage owned by the caller.
 * Copies the snapshot into the new skill's v1 (private by default).
 */
export async function forkSkillFromVersion(input: {
  sourceSkillId: string;
  /** Defaults to the latest version the forker may see. */
  versionNumber?: number;
  ownerUserId: string;
}): Promise<Skill> {
  const source = await getSkill(input.sourceSkillId, input.ownerUserId, {
    versionNumber: input.versionNumber,
  });
  if (!source) throw new Error("Skill version not found.");
  if (!source.versionId || source.versionNumber == null) {
    throw new Error("Skill version not found.");
  }

  const slug = await uniqueSlug(source.name);

  const [skill] = await db
    .insert(skills)
    .values({
      slug,
      ownerUserId: input.ownerUserId,
      forkedFromVersionId: source.versionId,
    })
    .returning({ id: skills.id });

  const [version] = await db
    .insert(skillVersions)
    .values({
      skillId: skill.id,
      versionNumber: 1,
      name: source.name,
      summary: source.summary,
      description: source.description,
      usage: source.usage,
      thumbnailUrl: source.thumbnailUrl,
      parameters: source.parameters,
      exampleOutput: source.exampleOutput,
      scenarios: source.scenarios,
      visibility: "private",
      authorUserId: input.ownerUserId,
    })
    .returning({ id: skillVersions.id });

  return {
    id: skill.id,
    name: source.name,
    summary: source.summary,
    description: source.description,
    usage: source.usage,
    thumbnailUrl: source.thumbnailUrl,
    parameters: source.parameters,
    exampleOutput: source.exampleOutput,
    scenarios: source.scenarios,
    ownerUserId: input.ownerUserId,
    versionId: version.id,
    versionNumber: 1,
    draftMarkdown: null,
    draftUpdatedAt: null,
  };
}

/**
 * Autosave in-progress edits onto the skill lineage. Does not create a version.
 * Owner only.
 */
export async function saveSkillDraft(input: {
  skillId: string;
  markdown: string;
  ownerUserId: string;
}): Promise<{ draftUpdatedAt: Date }> {
  const byId = UUID_RE.test(input.skillId)
    ? eq(skills.id, input.skillId)
    : eq(skills.slug, input.skillId);

  const [lineage] = await db
    .select({ id: skills.id, ownerUserId: skills.ownerUserId })
    .from(skills)
    .where(byId)
    .limit(1);

  if (!lineage) throw new Error("Skill not found.");
  if (lineage.ownerUserId !== input.ownerUserId) {
    throw new Error("Only the skill owner can save a draft.");
  }

  const draftUpdatedAt = new Date();
  await db
    .update(skills)
    .set({
      draftMarkdown: input.markdown,
      draftUpdatedAt,
    })
    .where(eq(skills.id, lineage.id));

  return { draftUpdatedAt };
}

/**
 * Drop an unpublished draft. Owner only.
 */
export async function discardSkillDraft(input: {
  skillId: string;
  ownerUserId: string;
}): Promise<void> {
  const byId = UUID_RE.test(input.skillId)
    ? eq(skills.id, input.skillId)
    : eq(skills.slug, input.skillId);

  const [lineage] = await db
    .select({ id: skills.id, ownerUserId: skills.ownerUserId })
    .from(skills)
    .where(byId)
    .limit(1);

  if (!lineage) throw new Error("Skill not found.");
  if (lineage.ownerUserId !== input.ownerUserId) {
    throw new Error("Only the skill owner can discard a draft.");
  }

  await db
    .update(skills)
    .set({ draftMarkdown: null, draftUpdatedAt: null })
    .where(eq(skills.id, lineage.id));
}

/**
 * Soft-delete a version. Owner only. Blocked when the version has been forked
 * or when it is the last live version on the skill.
 */
export async function deleteSkillVersion(input: {
  skillId: string;
  versionNumber: number;
  ownerUserId: string;
}): Promise<{ redirectToVersionNumber: number | null }> {
  const byId = UUID_RE.test(input.skillId)
    ? eq(skills.id, input.skillId)
    : eq(skills.slug, input.skillId);

  const [lineage] = await db
    .select({ id: skills.id, ownerUserId: skills.ownerUserId })
    .from(skills)
    .where(byId)
    .limit(1);

  if (!lineage) throw new Error("Skill not found.");
  if (lineage.ownerUserId !== input.ownerUserId) {
    throw new Error("Only the skill owner can delete a version.");
  }

  const [version] = await db
    .select({
      id: skillVersions.id,
      versionNumber: skillVersions.versionNumber,
      deletedAt: skillVersions.deletedAt,
    })
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, lineage.id),
        eq(skillVersions.versionNumber, input.versionNumber),
      ),
    )
    .limit(1);

  if (!version) throw new Error("Skill version not found.");
  if (version.deletedAt) throw new Error("Skill version is already deleted.");

  const [fork] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.forkedFromVersionId, version.id))
    .limit(1);

  if (fork) {
    throw new Error("Cannot delete a version that has been forked.");
  }

  const [liveCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, lineage.id),
        isNull(skillVersions.deletedAt),
      ),
    );

  if ((liveCount?.count ?? 0) <= 1) {
    throw new Error("Cannot delete the only remaining version.");
  }

  await db
    .update(skillVersions)
    .set({ deletedAt: new Date() })
    .where(eq(skillVersions.id, version.id));

  const [earlier] = await db
    .select({ versionNumber: skillVersions.versionNumber })
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, lineage.id),
        isNull(skillVersions.deletedAt),
        lt(skillVersions.versionNumber, version.versionNumber),
      ),
    )
    .orderBy(desc(skillVersions.versionNumber))
    .limit(1);

  if (earlier) {
    return { redirectToVersionNumber: earlier.versionNumber };
  }

  const [latest] = await db
    .select({ versionNumber: skillVersions.versionNumber })
    .from(skillVersions)
    .where(
      and(
        eq(skillVersions.skillId, lineage.id),
        isNull(skillVersions.deletedAt),
      ),
    )
    .orderBy(desc(skillVersions.versionNumber))
    .limit(1);

  return { redirectToVersionNumber: latest?.versionNumber ?? null };
}

/**
 * Append a new version from edited Markdown. Only the skill owner may publish.
 * Clears any draft after publishing.
 */
export async function createSkillVersion(input: {
  skillId: string;
  markdown: string;
  authorUserId: string;
}): Promise<Skill> {
  const markdown = input.markdown.trim();
  if (!markdown) throw new Error("Markdown content is required.");

  const byId = UUID_RE.test(input.skillId)
    ? eq(skills.id, input.skillId)
    : eq(skills.slug, input.skillId);

  const [lineage] = await db
    .select({ id: skills.id, ownerUserId: skills.ownerUserId })
    .from(skills)
    .where(byId)
    .limit(1);

  if (!lineage) throw new Error("Skill not found.");
  if (lineage.ownerUserId !== input.authorUserId) {
    throw new Error("Only the skill owner can save a new version.");
  }

  // Include soft-deleted rows so version numbers stay monotonic.
  const [latest] = await db
    .select({
      versionNumber: skillVersions.versionNumber,
      name: skillVersions.name,
      thumbnailUrl: skillVersions.thumbnailUrl,
      scenarios: skillVersions.scenarios,
      visibility: skillVersions.visibility,
      deletedAt: skillVersions.deletedAt,
    })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, lineage.id))
    .orderBy(desc(skillVersions.versionNumber))
    .limit(1);

  if (!latest) throw new Error("Skill has no versions to edit.");

  // Copy metadata from the latest *live* version when the absolute latest
  // was soft-deleted.
  let template = latest;
  if (latest.deletedAt) {
    const [live] = await db
      .select({
        versionNumber: skillVersions.versionNumber,
        name: skillVersions.name,
        thumbnailUrl: skillVersions.thumbnailUrl,
        scenarios: skillVersions.scenarios,
        visibility: skillVersions.visibility,
        deletedAt: skillVersions.deletedAt,
      })
      .from(skillVersions)
      .where(
        and(
          eq(skillVersions.skillId, lineage.id),
          isNull(skillVersions.deletedAt),
        ),
      )
      .orderBy(desc(skillVersions.versionNumber))
      .limit(1);
    if (!live) throw new Error("Skill has no versions to edit.");
    template = live;
  }

  const nextVersion = latest.versionNumber + 1;
  const summary = summaryFromMarkdown(markdown);

  await db.insert(skillVersions).values({
    skillId: lineage.id,
    versionNumber: nextVersion,
    name: template.name,
    summary,
    description: markdown,
    usage: "",
    thumbnailUrl: template.thumbnailUrl,
    parameters: [],
    exampleOutput: { title: "", items: [] },
    scenarios: template.scenarios,
    visibility: template.visibility,
    authorUserId: input.authorUserId,
  });

  await db
    .update(skills)
    .set({ draftMarkdown: null, draftUpdatedAt: null })
    .where(eq(skills.id, lineage.id));

  return {
    id: lineage.id,
    name: template.name,
    summary,
    description: markdown,
    usage: "",
    thumbnailUrl: template.thumbnailUrl,
    parameters: [],
    exampleOutput: { title: "", items: [] },
    scenarios: template.scenarios,
    ownerUserId: lineage.ownerUserId,
    draftMarkdown: null,
    draftUpdatedAt: null,
  };
}
