import { PORTAL_BASE_URL } from "./config";

/** Public display info for a portal user, resolved by id. */
export interface PortalUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface PortalLookupResponse {
  users?: Array<{
    id: string;
    name?: string | null;
    image?: string | null;
  }>;
}

/**
 * Resolve portal users by id via the portal directory (`/api/users/lookup`).
 * Requires a portal-issued bearer token (the session `apiToken`). Failures are
 * swallowed and return an empty map so owner attribution never breaks a page.
 */
export async function lookupPortalUsers(
  ids: Array<string | null | undefined>,
  apiToken: string,
): Promise<Map<string, PortalUser>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const params = new URLSearchParams();
  for (const id of unique) params.append("identifier", id);

  try {
    const url = new URL(
      `/api/users/lookup?${params.toString()}`,
      PORTAL_BASE_URL,
    );
    const response = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });
    if (!response.ok) return new Map();

    const data = (await response.json()) as PortalLookupResponse;
    const map = new Map<string, PortalUser>();
    for (const user of data.users ?? []) {
      map.set(user.id, {
        id: user.id,
        name: user.name ?? null,
        image: user.image ?? null,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}
