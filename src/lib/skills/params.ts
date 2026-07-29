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
 * Detail / share URL.
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
