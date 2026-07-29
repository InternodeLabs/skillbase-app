import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import type {
  SkillOutputSection,
  SkillParameter,
  SkillScenario,
} from "@/lib/skills/types";

/**
 * A `skill` is the lineage container (the "repo"). A fork is just a new skill
 * that points back at the exact version it branched from. Ownership lives here;
 * per-version visibility lives on `skill_version`.
 */
export const skills = pgTable("skill", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull(),
  // Null = original skill. Otherwise the version this skill was forked from.
  forkedFromVersionId: uuid("forked_from_version_id").references(
    (): AnyPgColumn => skillVersions.id,
  ),
  // In-progress edits. Mutated by autosave; publishing clears it and appends a version.
  draftMarkdown: text("draft_markdown"),
  draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Append-only snapshots. Each edit/publish is a new row. Visibility is per
 * version so a fork can be public at v1 and private at v2.
 */
export const skillVersions = pgTable(
  "skill_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    usage: text("usage").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    parameters: jsonb("parameters")
      .$type<SkillParameter[]>()
      .notNull()
      .default([]),
    exampleOutput: jsonb("example_output")
      .$type<SkillOutputSection>()
      .notNull()
      .default({ title: "", items: [] }),
    scenarios: jsonb("scenarios").$type<SkillScenario[]>().notNull().default([]),
    visibility: text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("private"),
    authorUserId: text("author_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("skill_version_skill_id_version_number_idx").on(
      table.skillId,
      table.versionNumber,
    ),
  ],
);

export type SkillRow = typeof skills.$inferSelect;
export type SkillVersionRow = typeof skillVersions.$inferSelect;
