import { Suspense } from "react";

import { AppHeader, UploadOrSignIn } from "@/components/AppHeader";
import { SkillGrid } from "@/components/SkillGrid";
import { SkillGridSkeleton } from "@/components/SkillGridSkeleton";
import { SkillsFilterTabs } from "@/components/SkillsFilterTabs";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import type { SkillVisibility } from "@/lib/skills/types";

function parseVisibility(
  raw: string | string[] | undefined,
): SkillVisibility {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "private" ? "private" : "public";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; visibility?: string | string[] }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = raw?.trim() || undefined;
  const visibility = parseVisibility(params.visibility);

  return (
    <>
      <AppHeader user={session?.user} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-3xl font-bold">Skills</div>
          <div>
            <UploadOrSignIn
              signedIn={Boolean(session?.user)}
              signInHref={loginStartHref("/")}
              label="Upload Skill"
            />
          </div>
        </div>
        {query ? (
          <p className="mb-6 text-sm text-muted">
            Results for{" "}
            <span className="font-medium text-foreground">“{query}”</span>
          </p>
        ) : null}

        <Suspense
          fallback={
            <div className="mb-6 h-9 border-b border-border" aria-hidden />
          }
        >
          <SkillsFilterTabs className="mb-6" value={visibility} />
        </Suspense>

        <Suspense
          key={visibility}
          fallback={<SkillGridSkeleton loading />}
        >
          <SkillGrid
            viewerUserId={session?.user.id}
            query={query}
            visibility={visibility}
          />
        </Suspense>
      </main>
    </>
  );
}
