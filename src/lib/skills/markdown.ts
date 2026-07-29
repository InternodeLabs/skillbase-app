import type { Skill } from "./types";

/** Query keys used by the app — never treated as `{{param}}` values. */
export const RESERVED_SKILL_QUERY_PARAMS = new Set([
  "v",
  "raw",
  "code",
  "edit",
]);

const PLACEHOLDER_RE = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined | null>;

function paramValue(params: ParamSource, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    if (!params.has(key)) return undefined;
    return params.get(key) ?? "";
  }
  const value = params[key];
  if (value == null) return undefined;
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

/**
 * Replace `{{name}}` placeholders with matching URL query values.
 * Missing params leave the placeholder unchanged. Reserved keys (`v`, `raw`,
 * `code`, `edit`) are never substituted.
 */
export function applyMarkdownParams(
  markdown: string,
  params: ParamSource,
): string {
  return markdown.replace(PLACEHOLDER_RE, (match, name: string) => {
    if (RESERVED_SKILL_QUERY_PARAMS.has(name)) return match;
    const value = paramValue(params, name);
    return value === undefined ? match : value;
  });
}

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
