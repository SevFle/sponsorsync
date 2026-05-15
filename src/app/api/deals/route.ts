import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { calculateDealProgress, createDealSchema } from "@/domain/deals";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [userDeals, userSponsors, userDeliverables] = await Promise.all([
      getDealsByUserId(userId),
      getSponsorsByUserId(userId),
      getDeliverablesByUserId(userId),
    ]);

    const sponsorMap = new Map(userSponsors.map((s) => [s.id, s]));

    const deals = userDeals.map((deal) => {
      const sponsor = sponsorMap.get(deal.sponsorId);
      const dealDeliverables = userDeliverables.filter(
        (d) => d.dealId === deal.id
      );
      const totalDeliverables = dealDeliverables.length;
      const completedDeliverables = dealDeliverables.filter(
        (d) => d.status === "verified" || d.status === "submitted"
      ).length;
      const progress = calculateDealProgress(
        totalDeliverables,
        completedDeliverables
      );

      return {
        id: deal.id,
        sponsorName: sponsor?.name ?? "Unknown",
        title: deal.title,
        description: deal.description,
        status: deal.status,
        totalValue: deal.totalValue,
        currency: deal.currency ?? "USD",
        endDate: deal.endDate,
        progress,
      };
    });

    return NextResponse.json({ deals });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
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

  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  return NextResponse.json({ deal: parsed.data }, { status: 201 });
}
