import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import {
  SkillDetailView,
  skillDetailMetadata,
} from "@/components/SkillDetailView";
import { getSkillIdByOwnerUsernameAndSlug } from "@/lib/skills/data";
import {
  parseRawParam,
  parseSkillFileSegment,
  skillSharePath,
} from "@/lib/skills/params";
import { validateUsername } from "@/lib/users/username";

function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function queryToSearchParams(
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const raw = firstQueryValue(value);
    if (raw === undefined) continue;
    params.set(key, raw);
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/**
 * Pretty skill URL: `/{username}/{slug}.md`.
 * Renders the skill page in place for browsing. `?raw=1` redirects to the
 * canonical UUID markdown URL (share / agent path).
 */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; file: string }>;
  searchParams: Promise<{ v?: string | string[]; code?: string | string[] }>;
}): Promise<Metadata> {
  const { username: rawUsername, file } = await params;
  const query = await searchParams;
  const validated = validateUsername(rawUsername);
  if (!validated.ok) return { title: "Not found" };
  const slug = parseSkillFileSegment(file);
  if (!slug) return { title: "Not found" };
  const skillId = await getSkillIdByOwnerUsernameAndSlug(
    validated.username,
    slug,
  );
  if (!skillId) return { title: "Not found" };
  return skillDetailMetadata(skillId, query);
}

export default async function VanitySkillPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; file: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username: rawUsername, file } = await params;
  const query = await searchParams;

  const validated = validateUsername(rawUsername);
  if (!validated.ok) notFound();

  const slug = parseSkillFileSegment(file);
  if (!slug) notFound();

  if (rawUsername !== validated.username || file !== `${slug}.md`) {
    permanentRedirect(
      `/${validated.username}/${slug}.md${queryToSearchParams(query)}`,
    );
  }

  const skillId = await getSkillIdByOwnerUsernameAndSlug(
    validated.username,
    slug,
  );
  if (!skillId) notFound();

  // Agents / Sync: raw markdown stays on the never-broken UUID share URL.
  if (parseRawParam(query.raw)) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const raw = firstQueryValue(value);
      if (raw === undefined) continue;
      params.set(key, raw);
    }
    if (!params.has("raw")) params.set("raw", "1");
    const q = params.toString();
    redirect(q ? `/skills/${skillId}?${q}` : skillSharePath(skillId, { raw: true }));
  }

  return <SkillDetailView skillId={skillId} searchParams={query} />;
}
