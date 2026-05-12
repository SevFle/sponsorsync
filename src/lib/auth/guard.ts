import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function getServerSessionOrNull() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}
