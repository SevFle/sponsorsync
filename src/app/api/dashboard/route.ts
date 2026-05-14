import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDashboardData } from "@/lib/dashboard/data";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const data = await getDashboardData(userId);

  return NextResponse.json(data);
}
