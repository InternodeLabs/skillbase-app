import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { AppHeader, UploadOrSignIn } from "@/components/AppHeader";
import { SkillGrid } from "@/components/SkillGrid";
import { SkillGridSkeleton } from "@/components/SkillGridSkeleton";
import { SkillsFilterTabs } from "@/components/SkillsFilterTabs";
import { lookupPortalUsers } from "@/lib/auth/portal-users";
import { getSession } from "@/lib/auth/server";
import type { Session } from "@/lib/auth/session";
import { loginStartHref } from "@/lib/auth/urls";
import type { SkillVisibility } from "@/lib/skills/types";
import { getUserProfileByUsername, getUsernameForUser } from "@/lib/users/profile";
import { validateUsername } from "@/lib/users/username";

function parseVisibility(
  raw: string | string[] | undefined,
): SkillVisibility {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "private" ? "private" : "public";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

async function resolveDisplayName(
  userId: string,
  session: Session | null,
  isViewer: boolean,
): Promise<{ name: string | null; image: string | null }> {
  let name: string | null = null;
  let image: string | null = null;

  if (session?.apiToken) {
    const users = await lookupPortalUsers([userId], session.apiToken);
    const user = users.get(userId);
    name = user?.name ?? null;
    image = user?.image ?? null;
  }

  if (!name && isViewer && session?.user) {
    name = session.user.name ?? session.user.email ?? null;
    image = session.user.image ?? null;
  }

  return { name, image };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: raw } = await params;
  const validated = validateUsername(raw);
  if (!validated.ok) return { title: "Not found" };

  const profile = await getUserProfileByUsername(validated.username);
  if (!profile) return { title: "Not found" };

  return {
    title: `${profile.username} · Skillbase`,
    description: `Skills by ${profile.username} on Skillbase`,
  };
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ visibility?: string | string[] }>;
}) {
  const { username: raw } = await params;
  const validated = validateUsername(raw);
  if (!validated.ok) notFound();

  // Canonical lowercase URL (GitHub-style).
  if (raw !== validated.username) {
    permanentRedirect(`/${validated.username}`);
  }

  const profile = await getUserProfileByUsername(validated.username);
  if (!profile) notFound();

  const session = await getSession();
  const query = await searchParams;
  const isViewer = Boolean(
    session?.user.id && session.user.id === profile.userId,
  );
  const visibility = isViewer ? parseVisibility(query.visibility) : "public";
  const viewerUsername =
    session?.user.id && !isViewer
      ? await getUsernameForUser(session.user.id)
      : isViewer
        ? profile.username
        : null;
  const { name, image } = await resolveDisplayName(
    profile.userId,
    session,
    isViewer,
  );
  const displayName = name ?? profile.username;
  const avatarLabel = initials(displayName);
  const profilePath = `/${profile.username}`;

  return (
    <>
      <AppHeader
        user={session?.user}
        username={viewerUsername}
        returnTo={profilePath}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="h-16 w-16 rounded-full object-cover bg-skeleton"
              />
            ) : (
              <span
                aria-hidden
                className="grid h-16 w-16 place-items-center rounded-full bg-skeleton text-lg font-semibold text-foreground"
              >
                {avatarLabel}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-muted">
                skillbase.club/{profile.username}
                {isViewer ? " · This is you" : null}
              </p>
            </div>
          </div>

          {isViewer ? (
            <UploadOrSignIn
              signedIn
              signInHref={loginStartHref(profilePath)}
              label="Upload Skill"
              username={profile.username}
            />
          ) : null}
        </section>

        {isViewer ? (
          <Suspense
            fallback={
              <div className="mb-6 h-9 border-b border-border" aria-hidden />
            }
          >
            <SkillsFilterTabs
              className="mb-6"
              value={visibility}
              basePath={profilePath}
            />
          </Suspense>
        ) : (
          <h2 className="mb-6 text-sm font-medium tracking-wide text-muted uppercase">
            Public skills
          </h2>
        )}

        <Suspense fallback={<SkillGridSkeleton loading />}>
          <SkillGrid
            session={session}
            visibility={visibility}
            ownerUserId={profile.userId}
            showOwner={false}
            empty={
              isViewer
                ? visibility === "private"
                  ? "No private skills yet. Upload a Markdown file to get started."
                  : "No public skills yet. Upload a Markdown file to get started."
                : "No public skills yet."
            }
          />
        </Suspense>
      </main>
    </>
  );
}
