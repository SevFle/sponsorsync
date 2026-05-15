import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ integrations: [] });
}
