import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { createDeliverableSchema } from "@/domain/deliverables";
import { z } from "zod";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [userDeliverables, userDeals, userSponsors] = await Promise.all([
      getDeliverablesByUserId(userId),
      getDealsByUserId(userId),
      getSponsorsByUserId(userId),
    ]);

    const dealMap = new Map(userDeals.map((d) => [d.id, d]));
    const sponsorMap = new Map(userSponsors.map((s) => [s.id, s]));

    const deliverables = userDeliverables.map((deliverable) => {
      const deal = dealMap.get(deliverable.dealId);
      const sponsor = deal ? sponsorMap.get(deal.sponsorId) : undefined;

      return {
        id: deliverable.id,
        dealId: deliverable.dealId,
        title: deliverable.title,
        description: deliverable.description,
        status: deliverable.status,
        dueDate: deliverable.dueDate,
        completedDate: deliverable.completedDate,
        notes: deliverable.notes,
        createdAt: deliverable.createdAt,
        updatedAt: deliverable.updatedAt,
        sponsorName: sponsor?.name ?? "Unknown",
        sponsorId: sponsor?.id ?? "",
        dealTitle: deal?.title ?? "Unknown Deal",
      };
    });

    return NextResponse.json({ deliverables });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch deliverables" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createDeliverableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  return NextResponse.json({ deliverable: parsed.data }, { status: 201 });
}
