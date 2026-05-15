import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { apiKey: _apiKey, ...safeBody } = body;
  return NextResponse.json({ connected: true, ...safeBody }, { status: 201 });
}
