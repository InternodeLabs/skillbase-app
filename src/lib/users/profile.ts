import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { userProfiles, type UserProfileRow } from "@/lib/db/schema";
import { validateUsername } from "@/lib/users/username";

export async function getUserProfile(
  userId: string,
): Promise<UserProfileRow | null> {
  const [row] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getUsernameForUser(
  userId: string,
): Promise<string | null> {
  const profile = await getUserProfile(userId);
  return profile?.username ?? null;
}

/**
 * Claim a vanity username. First claim only — renaming comes later once
 * profile URLs are live.
 */
export async function claimUsername(input: {
  userId: string;
  username: string;
}): Promise<UserProfileRow> {
  const existing = await getUserProfile(input.userId);
  if (existing) {
    throw new Error("You already have a username.");
  }

  const validated = validateUsername(input.username);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const taken = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.username, validated.username))
    .limit(1);
  if (taken.length > 0) {
    throw new Error("That username is taken.");
  }

  try {
    const [row] = await db
      .insert(userProfiles)
      .values({
        userId: input.userId,
        username: validated.username,
      })
      .returning();
    if (!row) {
      throw new Error("Could not save username.");
    }
    return row;
  } catch (error) {
    // Unique race: another request claimed the same handle first.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new Error("That username is taken.");
    }
    throw error;
  }
}

export async function requireUsername(userId: string): Promise<string> {
  const username = await getUsernameForUser(userId);
  if (!username) {
    const error = new Error("Choose a username before adding a skill.");
    (error as Error & { code?: string }).code = "USERNAME_REQUIRED";
    throw error;
  }
  return username;
}
