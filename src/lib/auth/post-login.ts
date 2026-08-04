import { getUsernameForUser } from "@/lib/users/profile";

import { claimUsernamePath, sanitizeReturnTo } from "./urls";

export { claimUsernamePath, sanitizeReturnTo } from "./urls";

/**
 * Where to send the user after auth succeeds.
 * No Skillbase username yet → claim first; otherwise honor `returnTo`.
 */
export async function resolvePostAuthPath(
  userId: string,
  returnTo?: string | null,
): Promise<string> {
  const username = await getUsernameForUser(userId);
  if (!username) return claimUsernamePath(returnTo);
  return sanitizeReturnTo(returnTo);
}
