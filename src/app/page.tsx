import Link from "next/link";

import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth/server";
import { getSkills, SKELETON_TILE_COUNT } from "@/lib/skills/data";

export default async function HomePage() {
  const session = await getSession();
  const skills = await getSkills(session?.user.id);
  const skeletonCount = Math.max(0, SKELETON_TILE_COUNT - skills.length);

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

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {skills.map((skill) => (
            <li key={skill.id}>
              <Link
                href={`/skills/${skill.id}`}
                className="group block overflow-hidden rounded-xl border border-border bg-surface transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-skeleton text-xs text-muted">
                  Image placeholder
                </div>
                <div className="p-3">
                  <h2 className="truncate text-sm font-medium text-foreground">
                    {skill.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {skill.summary}
                  </p>
                </div>
              </Link>
            </li>
          ))}

          {Array.from({ length: skeletonCount }).map((_, index) => (
            <li key={`skeleton-${index}`} aria-hidden>
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="aspect-[4/3] skeleton" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 rounded skeleton" />
                  <div className="h-3 w-1/2 rounded skeleton" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
