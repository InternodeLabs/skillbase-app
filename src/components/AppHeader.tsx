import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";

import { BrandHomeLink } from "@/components/Brand";
import { SkillSearch } from "@/components/SkillSearch";
import { UploadSkillButton } from "@/components/UploadSkillButton";
import { loginStartHref } from "@/lib/auth/urls";
import type { SessionUser } from "@/lib/auth/session";

function initials(user: SessionUser): string {
  const base = user.name || user.email || "?";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function UploadOrSignIn({
  signedIn,
  signInHref,
}: {
  signedIn: boolean;
  signInHref: string;
}) {
  if (signedIn) return <UploadSkillButton />;

  return (
    <Link
      href={signInHref}
      aria-label="Sign in to upload a skill"
      title="Sign in to upload"
      className="grid h-7 w-7 place-items-center rounded-md border border-border text-foreground transition hover:bg-background"
    >
      <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}

export function AppHeader({
  user,
  back,
  returnTo,
  showSearch = true,
}: {
  user?: SessionUser | null;
  back?: { href: string; label: string };
  returnTo?: string;
  showSearch?: boolean;
}) {
  const signInHref = loginStartHref(returnTo ?? "/");
  const signedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandHomeLink />
          {back ? (
            <Link
              href={back.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">{back.label}</span>
            </Link>
          ) : null}
          <UploadOrSignIn signedIn={signedIn} signInHref={signInHref} />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          {showSearch ? (
            <Suspense
              fallback={
                <div className="h-9 w-full max-w-56 rounded-md border border-border bg-background sm:w-56" />
              }
            >
              <SkillSearch />
            </Suspense>
          ) : null}

          {user ? (
            <div className="flex items-center gap-2">
              <span
                title={user.email}
                className="grid h-8 w-8 place-items-center rounded-full bg-skeleton text-xs font-semibold text-foreground"
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
              href={signInHref}
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
