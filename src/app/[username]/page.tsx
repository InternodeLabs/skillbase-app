import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { ProfileSkillDropZone } from "@/components/ProfileSkillDropZone";
import { SkillGrid } from "@/components/SkillGrid";
import { SkillGridSkeleton } from "@/components/SkillGridSkeleton";
import { SkillsFilterTabs } from "@/components/SkillsFilterTabs";
import { UploadSkillButton } from "@/components/UploadSkillButton";
import { lookupPortalUsers } from "@/lib/auth/portal-users";
import { getSession } from "@/lib/auth/server";
import type { Session } from "@/lib/auth/session";
import { getSkills } from "@/lib/skills/data";
import type { SkillVisibility } from "@/lib/skills/types";
import {
  getUserProfileByUsername,
  getUsernameForUser,
} from "@/lib/users/profile";
import { validateUsername } from "@/lib/users/username";

const TAB_COPY: Record<
  SkillVisibility,
  {
    title: string;
    description: string;
    emptyOwner: string;
    emptyVisitor: string;
  }
> = {
  public: {
    title: "Public",
    description:
      "Skills shared publicly. Anyone who visits this page can see these.",
    emptyOwner:
      "No public skills yet. Drag a .md file here while on this tab, or upload one to share it with others.",
    emptyVisitor: "No public skills yet.",
  },
  private: {
    title: "Private",
    description:
      "Skills only you can see. Share them privately when you’re ready.",
    emptyOwner:
      "No private skills yet. Drag a .md file here while on this tab, or upload one to get started.",
    emptyVisitor: "No private skills yet.",
  },
};

function parseVisibility(raw: string | string[] | undefined): SkillVisibility {
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
  const tab = TAB_COPY[visibility];

  const ownedSkills = isViewer
    ? await getSkills(session?.user.id, { ownerUserId: profile.userId })
    : [];
  const hasOwnedSkills = ownedSkills.length > 0;
  const existingSlugs = ownedSkills.map((skill) => skill.slug);

  const profileBody = (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:min-h-[calc(100dvh-3.5rem)] md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border px-4 py-6 sm:px-6 md:w-70 md:border-b-0 md:border-r lg:w-[320px]">
        <div className="flex min-w-0 items-center gap-3">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="h-10 w-10 rounded-full object-cover bg-skeleton"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-full bg-skeleton text-sm font-semibold text-foreground"
            >
              {avatarLabel}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium tracking-tight text-foreground">
              @{profile.username}
            </p>
            {name ? (
              <p className="truncate text-sm text-muted">{name}</p>
            ) : null}
          </div>
        </div>

        {isViewer && !hasOwnedSkills ? (
          <div className="mt-6">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Upload your first skill
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Upload a Markdown skill to share it with others, or keep it
              private until you’re ready. You can also drag a .md file onto this
              page — it saves to whichever tab you’re on.
            </p>
            <div className="mt-5">
              <UploadSkillButton
                label="Upload skill"
                initialUsername={profile.username}
              />
            </div>
          </div>
        ) : null}

        {isViewer ? (
          <form
            action="/api/auth/logout"
            method="post"
            className="mt-auto pt-8"
          >
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              Sign out
            </button>
          </form>
        ) : null}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-surface px-4 py-6 sm:px-6">
        {isViewer ? (
          <Suspense
            fallback={
              <div className="h-9 border-b border-border" aria-hidden />
            }
          >
            <SkillsFilterTabs value={visibility} basePath={profilePath} />
          </Suspense>
        ) : (
          <div className="border-b border-border pb-2.5">
            <h2 className="text-sm font-medium text-foreground">Public</h2>
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {tab.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {tab.description}
          </p>
        </div>

        <div className="mt-6 flex flex-1 flex-col">
          <Suspense fallback={<SkillGridSkeleton loading />}>
            <SkillGrid
              session={session}
              visibility={visibility}
              ownerUserId={profile.userId}
              showOwner={false}
              empty={isViewer ? tab.emptyOwner : tab.emptyVisitor}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );

  return (
    <>
      <AppHeader
        user={session?.user}
        username={viewerUsername}
        returnTo={profilePath}
        showUpload={isViewer}
        showSignOut={!isViewer}
      />

      {isViewer ? (
        <ProfileSkillDropZone
          existingSlugs={existingSlugs}
          currentVisibility={visibility}
        >
          {profileBody}
        </ProfileSkillDropZone>
      ) : (
        profileBody
      )}
    </>
  );
}
