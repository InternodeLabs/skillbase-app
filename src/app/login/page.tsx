import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/Brand";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Your sign-in session expired. Please try again.",
  missing_verifier: "Your sign-in session expired. Please try again.",
  exchange_failed: "The portal rejected the sign-in. Please try again.",
  exchange_unreachable: "Couldn't reach the auth service. Please try again.",
  invalid_exchange_response: "Unexpected response from the auth service.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");

  const { error, returnTo } = await searchParams;
  const message = error
    ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.")
    : null;

  const loginHref = loginStartHref(returnTo);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo height={36} className="mb-4 h-9 w-auto" />
          <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Use your Internode account to continue.
          </p>
        </div>

        {message ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        ) : null}

        <Link
          href={loginHref}
          prefetch={false}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Continue with Internode
        </Link>

        <p className="mt-4 text-center text-xs text-muted">
          You&apos;ll be redirected to the central Internode sign-in.
        </p>
      </div>
    </main>
  );
}
