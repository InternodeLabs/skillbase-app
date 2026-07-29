import { redirect } from "next/navigation";

import { AuthenticatingClient } from "@/components/AuthenticatingClient";
import { getSession } from "@/lib/auth/server";

export default async function AuthenticatingPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await getSession();
  const { returnTo } = await searchParams;
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";

  if (session) redirect(safeReturnTo);

  return <AuthenticatingClient returnTo={safeReturnTo} />;
}
