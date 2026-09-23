import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

/** Returns the logged-in user's id, or null. Use in server components/route handlers. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
