import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { AuthenticatingClient } from "@/components/AuthenticatingClient";
import { ClaimUsernamePanel } from "@/components/ClaimUsernamePanel";
import { sanitizeReturnTo } from "@/lib/auth/urls";
import { getSession } from "@/lib/auth/server";
import { getUsernameForUser } from "@/lib/users/profile";

/**
 * Home:
 * - logged out → sign-in
 * - logged in, no username → claim your URL
 * - logged in with username → redirect to `returnTo` or `/{username}`
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await getSession();
  const { returnTo } = await searchParams;
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (!session?.user.id) {
    return <AuthenticatingClient returnTo="/" />;
  }

  const username = await getUsernameForUser(session.user.id);
  if (username) {
    redirect(safeReturnTo === "/" ? `/${username}` : safeReturnTo);
  }

  return (
    <>
      <AppHeader user={session.user} showSearch={false} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <ClaimUsernamePanel returnTo={safeReturnTo} />
      </main>
    </>
  );
}
