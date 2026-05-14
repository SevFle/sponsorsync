import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getSponsorById } from "@/lib/db/queries/sponsors";
import { getCommunicationsByUserId } from "@/lib/db/queries/communications";
import { z } from "zod";

const idParamSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idResult = idParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "Invalid id parameter", details: idResult.error.flatten() },
      { status: 400 }
    );
  }

  const userId = session.user.id;
  const sponsor = await getSponsorById(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

  try {
    const communications = await getCommunicationsByUserId(userId, {
      sponsorId: id,
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
