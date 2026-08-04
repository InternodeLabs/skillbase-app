import type { SkillVisibility } from "@/lib/skills/types";

/** Temporary static unlock for private skill share links (agents / Skillbase Sync). */
export const PRIVATE_SHARE_CODE = "123456789";

export function matchesPrivateShareCode(
  value: string | string[] | null | undefined,
): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === PRIVATE_SHARE_CODE;
}

/**
 * Share / Sync URL for a skill. Private versions include `code=` so unauthenticated
 * clients (Skillbase Sync, `?raw=1` agents) can fetch them.
 */
export function buildSkillSharePath(input: {
  skillId: string;
  visibility: SkillVisibility;
  selectedVersionNumber: number;
  shareForAgent?: boolean;
  shareLockedVersion?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input.shareLockedVersion) {
    params.set("v", String(input.selectedVersionNumber));
  }
  if (input.shareForAgent) {
    params.set("raw", "1");
  }
  if (input.visibility === "private") {
    params.set("code", PRIVATE_SHARE_CODE);
  }
  const query = params.toString();
  return query ? `/skills/${input.skillId}?${query}` : `/skills/${input.skillId}`;
}
