import { cookies } from "next/headers";

import { SESSION_COOKIE } from "./config";
import { verifySession, type Session } from "./session";

/** Read + verify the current session inside a Server Component / route handler. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
