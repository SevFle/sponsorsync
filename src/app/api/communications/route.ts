import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getCommunicationsByUserId } from "@/lib/db/queries/communications";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sponsorId = searchParams.get("sponsorId") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  try {
    const communications = await getCommunicationsByUserId(session.user.id, {
      sponsorId,
      limit: limit && !isNaN(limit) ? limit : undefined,
      offset: offset && !isNaN(offset) ? offset : undefined,
    });
    return NextResponse.json({ communications });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch communications" },
      { status: 500 }
    );
  }
}
