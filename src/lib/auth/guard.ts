import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";

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

export async function requireAuth() {
  const session = await getAuthenticatedSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
