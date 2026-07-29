/** How many skeleton tiles to show while the library grid is loading. */
export const SKILL_GRID_SKELETON_COUNT = 12;

export function SkillGridSkeleton({
  count = SKILL_GRID_SKELETON_COUNT,
}: {
  count?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <li key={`skeleton-${index}`} aria-hidden>
          <div className="overflow-hidden rounded-xl border border-border bg-tile-footer">
            <div className="aspect-4/3 skeleton" />
            <div className="space-y-2 bg-tile-footer p-3">
              <div className="h-3.5 w-3/4 rounded skeleton" />
              <div className="h-3 w-1/2 rounded skeleton" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
