/**
 * Seeds the sample skill as skill A / version 1 (public) so the existing UI has
 * data to render. Idempotent: skips if a skill with the same slug already exists.
 *
 * Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";

import { db } from "./client";
import { skills, skillVersions } from "./schema";

const SEED_OWNER = "seed";

async function main() {
  const slug = "summarize-customer-feedback";

  const existing = await db
    .select({ id: skills.id })
    .from(skills)
    .where(eq(skills.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Skill "${slug}" already exists — nothing to seed.`);
    return;
  }

  const [skill] = await db
    .insert(skills)
    .values({ slug, ownerUserId: SEED_OWNER })
    .returning({ id: skills.id });

  await db.insert(skillVersions).values({
    skillId: skill.id,
    versionNumber: 1,
    name: "Summarize Customer Feedback",
    summary:
      "Aggregate and summarize large volumes of customer feedback into structured insights.",
    description:
      "A prompt skill that aggregates and summarizes large volumes of customer feedback into structured insights. Useful for support teams, product managers, and researchers.",
    usage: `/summarize-feedback
  --source  "raw_feedback.csv"
  --output  "summary.md"
  --tone    neutral`,
    parameters: [
      { name: "source", description: "path to input file (CSV or plain text)" },
      { name: "output", description: "destination file for the summary" },
      { name: "tone", description: "neutral · formal · concise" },
    ],
    exampleOutput: {
      title: "Top themes (last 30 days)",
      items: [
        "Onboarding friction — 38% of responses",
        "Missing dark mode — 24% of responses",
        "Slow export performance — 19% of responses",
      ],
    },
    scenarios: [
      { id: "landing-page", label: "Landing page" },
      { id: "support-inbox", label: "Support inbox" },
      { id: "survey-export", label: "Survey export" },
    ],
    visibility: "public",
    authorUserId: SEED_OWNER,
  });

  console.log(`Seeded skill "${slug}" (v1, public).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
