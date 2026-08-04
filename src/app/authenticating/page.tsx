import { redirect } from "next/navigation";

import { AuthenticatingClient } from "@/components/AuthenticatingClient";
import { resolvePostAuthPath } from "@/lib/auth/post-login";
import { getSession } from "@/lib/auth/server";
import { sanitizeReturnTo } from "@/lib/auth/urls";

export default async function AuthenticatingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await getSession();
  const { returnTo } = await searchParams;
  const safeReturnTo = sanitizeReturnTo(returnTo);

  if (session?.user.id) {
    redirect(await resolvePostAuthPath(session.user.id, safeReturnTo));
  }

  return <AuthenticatingClient returnTo={safeReturnTo} />;
}
