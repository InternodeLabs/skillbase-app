import type { Skill } from "./types";

/**
 * Build the single markdown document shown/edited on the skill detail page.
 * Uploaded skills already store the full body in `description`. Seeded /
 * structured skills also have usage/parameters/example fields — fold those in
 * so edit mode covers the whole card, not just the top prose.
 */
export function composeSkillMarkdown(skill: Skill): string {
  const hasStructured =
    Boolean(skill.usage.trim()) ||
    skill.parameters.length > 0 ||
    Boolean(skill.exampleOutput.title.trim()) ||
    skill.exampleOutput.items.length > 0;

  if (!hasStructured) {
    return skill.description;
  }

  const parts: string[] = [];

  if (skill.description.trim()) {
    parts.push(skill.description.trim());
  }

  if (skill.usage.trim()) {
    parts.push(`## Usage\n\n\`\`\`\n${skill.usage.trim()}\n\`\`\``);
  }

  if (skill.parameters.length > 0) {
    const list = skill.parameters
      .map((param) => `- \`${param.name}\` — ${param.description}`)
      .join("\n");
    parts.push(`## Parameters\n\n${list}`);
  }

  if (
    skill.exampleOutput.title.trim() ||
    skill.exampleOutput.items.length > 0
  ) {
    const lines: string[] = ["## Example Output", ""];
    if (skill.exampleOutput.title.trim()) {
      lines.push(`**${skill.exampleOutput.title.trim()}**`, "");
    }
    skill.exampleOutput.items.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
    parts.push(lines.join("\n").trim());
  }

  return parts.join("\n\n");
}
