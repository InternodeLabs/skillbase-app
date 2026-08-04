/** Parse `?v=` into a positive version number, or undefined if missing/invalid. */
export function parseVersionParam(
  value: string | string[] | null | undefined,
): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= 1 ? n : undefined;
}

/** True when `?raw` is present (any value, including empty). */
export function parseRawParam(
  value: string | string[] | null | undefined,
): boolean {
  if (value == null) return false;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw !== undefined;
}

/**
 * Pretty (fragile) skill path: `/{username}/{slug}.md`.
 * Prefer {@link skillSharePath} for share / bookmark links — UUID never breaks
 * if the skill is renamed or the username changes.
 */
export function vanitySkillPath(username: string, slug: string): string {
  const handle = username.trim().toLowerCase();
  const file = slug.trim().toLowerCase().replace(/\.md$/i, "");
  return `/${handle}/${file}.md`;
}

/**
 * In-app navigation path. Uses `/{username}/{slug}.md` when both are known;
 * falls back to `/skills/{id}`. Share / copy links should use {@link skillSharePath}.
 */
export function skillBrowsePath(input: {
  skillId: string;
  slug?: string | null;
  ownerUsername?: string | null;
  versionNumber?: number;
  latestVersionNumber?: number;
  edit?: boolean;
  code?: string;
  extra?: Record<string, string | undefined>;
}): string {
  const params = new URLSearchParams();
  const versionNumber = input.versionNumber;
  const latest = input.latestVersionNumber;
  if (
    versionNumber != null &&
    (latest == null || versionNumber !== latest)
  ) {
    params.set("v", String(versionNumber));
  }
  if (input.edit) params.set("edit", "1");
  if (input.code) params.set("code", input.code);
  if (input.extra) {
    for (const [key, value] of Object.entries(input.extra)) {
      if (value == null || value === "") continue;
      if (key === "v" || key === "raw" || key === "code" || key === "edit") {
        continue;
      }
      params.set(key, value);
    }
  }

  const username = input.ownerUsername?.trim();
  const slug = input.slug?.trim();
  const base =
    username && slug
      ? vanitySkillPath(username, slug)
      : `/skills/${input.skillId}`;
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Extract the skill slug from a vanity file segment (`foo.md` → `foo`).
 * Returns null when the segment is missing the `.md` suffix or empty.
 */
export function parseSkillFileSegment(
  file: string | null | undefined,
): string | null {
  if (!file) return null;
  const trimmed = file.trim();
  if (!trimmed.toLowerCase().endsWith(".md")) return null;
  const slug = trimmed.slice(0, -3).trim().toLowerCase();
  if (!slug || slug.includes("/") || slug.includes("\\")) return null;
  return slug;
}

/**
 * Detail / share URL (canonical).
 * - Website: `/skills/{id}` or `/skills/{id}?v=N`
 * - Agent (markdown text): add `raw=1`
 * - Optional `code` unlocks private versions (hidden bypass).
 */
export function skillSharePath(
  skillId: string,
  options?: {
    versionNumber?: number;
    latestVersionNumber?: number;
    raw?: boolean;
    code?: string;
    /** Extra query params (e.g. `edit`, template substitutions). */
    extra?: Record<string, string | undefined>;
  },
) {
  const params = new URLSearchParams();
  const versionNumber = options?.versionNumber;
  const latest = options?.latestVersionNumber;
  if (
    versionNumber != null &&
    (latest == null || versionNumber !== latest)
  ) {
    params.set("v", String(versionNumber));
  }
  if (options?.raw) params.set("raw", "1");
  if (options?.code) params.set("code", options.code);
  if (options?.extra) {
    for (const [key, value] of Object.entries(options.extra)) {
      if (value == null || value === "") continue;
      if (key === "v" || key === "raw" || key === "code") continue;
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/skills/${skillId}?${query}` : `/skills/${skillId}`;
}

/** Detail URL for a version: omit `?v=` when it is the latest live version. */
export function versionPath(
  skillId: string,
  versionNumber: number,
  latestVersionNumber: number,
  options?: { raw?: boolean; code?: string },
) {
  return skillSharePath(skillId, {
    versionNumber,
    latestVersionNumber,
    raw: options?.raw,
    code: options?.code,
  });
}
