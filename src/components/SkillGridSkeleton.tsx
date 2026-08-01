import { cn } from "@/lib/utils";

/** How many skeleton tiles to show while the library grid is loading. */
export const SKILL_GRID_SKELETON_COUNT = 12;

/** Minimum tiles in the populated library grid (real + skeleton fillers). */
export const SKILL_GRID_MIN_TILES = 8;

export function SkillSkeletonTile({ loading = false }: { loading?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-tile-footer h-full">
      <div
        className={cn("aspect-4/3", loading ? "skeleton-loading" : "skeleton")}
      />
      <div className="space-y-2 bg-tile-footer p-3">
        <div
          className={cn(
            "h-3.5 w-3/4 rounded",
            loading ? "skeleton-loading" : "skeleton",
          )}
        />
        <div
          className={cn(
            "h-3 w-1/2 rounded",
            loading ? "skeleton-loading" : "skeleton",
          )}
        />
         <div
          className={cn(
            "h-3 w-full rounded",
            loading ? "skeleton-loading" : "skeleton",
          )}
        />
      </div>
    </div>
  );
}

export function SkillGridSkeleton({
  count = SKILL_GRID_SKELETON_COUNT,
  loading = false,
}: {
  count?: number;
  loading?: boolean;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <li key={`skeleton-${index}`} aria-hidden>
          <SkillSkeletonTile loading={loading} />
        </li>
      ))}
    </ul>
  );
}
