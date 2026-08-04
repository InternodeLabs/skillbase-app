"use client";

import { useRouter } from "next/navigation";

import { ClaimUsernameForm } from "@/components/ClaimUsernameForm";
import { sanitizeReturnTo } from "@/lib/auth/urls";

/** Full-page onboarding when a signed-in user has no vanity username yet. */
export function ClaimUsernamePanel({
  returnTo,
}: {
  returnTo?: string | null;
}) {
  const router = useRouter();
  const safeReturnTo = sanitizeReturnTo(returnTo);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight">Choose your URL</h1>
      <div className="mt-4">
        <ClaimUsernameForm
          submitLabel="Create profile"
          description="Your profile is public at this address. You’ll need one before you can add skills."
          onClaimed={(username) => {
            router.replace(safeReturnTo === "/" ? `/${username}` : safeReturnTo);
            router.refresh();
          }}
        />
      </div>
    </div>
  );
}
