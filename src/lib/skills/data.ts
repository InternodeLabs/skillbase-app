/**
 * Placeholder skill data. This is intentionally static seed content so the
 * Skill Library grid and detail pages are demonstrable before we wire up a real
 * data source. Replace `getSkills` / `getSkill` with real fetches later.
 */

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

export interface Skill {
  id: string;
  name: string;
  summary: string;
  description: string;
  usage: string;
  parameters: SkillParameter[];
  exampleOutput: SkillOutputSection;
  scenarios: SkillScenario[];
}

const SKILLS: Skill[] = [
  {
    id: "summarize-customer-feedback",
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
  },
];

/** Number of skeleton tiles to show while there is no real data yet. */
export const SKELETON_TILE_COUNT = 12;

export function getSkills(): Skill[] {
  return SKILLS;
}

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
