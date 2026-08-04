import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { AuthenticatingClient } from "@/components/AuthenticatingClient";
import { ClaimUsernamePanel } from "@/components/ClaimUsernamePanel";
import { getSession } from "@/lib/auth/server";
import { getUsernameForUser } from "@/lib/users/profile";

/**
 * Home:
 * - logged out → sign-in
 * - logged in, no username → claim your URL
 * - logged in with username → redirect to `/{username}`
 */
export default async function HomePage() {
  const session = await getSession();

  if (!session?.user.id) {
    return <AuthenticatingClient returnTo="/" />;
  }

  const username = await getUsernameForUser(session.user.id);
  if (username) {
    redirect(`/${username}`);
  }

  return (
    <>
      <AppHeader user={session.user} showSearch={false} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <ClaimUsernamePanel />
      </main>
    </>
  );
}
