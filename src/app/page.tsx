import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { SkillGrid } from "@/components/SkillGrid";
import { SkillGridSkeleton } from "@/components/SkillGridSkeleton";
import { getSession } from "@/lib/auth/server";

export default async function HomePage() {
  const session = await getSession();

  return (
    <>
      <AppHeader user={session?.user} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Skill Library</h1>
            <p className="mt-1 text-sm text-muted">
              Browse reusable skills. More coming soon.
            </p>
          </div>
        </div>

        <Suspense fallback={<SkillGridSkeleton />}>
          <SkillGrid viewerUserId={session?.user.id} />
        </Suspense>
      </main>
    </>
  );
}
