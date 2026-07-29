import Link from "next/link";

import type { SessionUser } from "@/lib/auth/session";

function initials(user: SessionUser): string {
  const base = user.name || user.email || "?";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AppHeader({
  user,
  back,
}: {
  user?: SessionUser | null;
  back?: { href: string; label: string };
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <Link
              href={back.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">{back.label}</span>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-xs font-bold text-accent-foreground">
                SB
              </span>
              <span className="text-sm font-semibold tracking-tight">Skillbase</span>
            </Link>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search skills</span>
            <input
              type="search"
              disabled
              placeholder="Search skills…"
              className="h-9 w-56 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed"
            />
          </label>

          {user ? (
            <div className="flex items-center gap-2">
              <span
                title={user.email}
                className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
              >
                {initials(user)}
              </span>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
                >
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
