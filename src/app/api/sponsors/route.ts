import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { createSponsor } from "@/lib/db/queries/sponsors";
import { createSponsorSchema } from "@/domain/sponsors";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [userSponsors, userDeals] = await Promise.all([
      getSponsorsByUserId(userId),
      getDealsByUserId(userId),
    ]);

    const dealsBySponsor = new Map<string, typeof userDeals>();
    for (const deal of userDeals) {
      const list = dealsBySponsor.get(deal.sponsorId) ?? [];
      list.push(deal);
      dealsBySponsor.set(deal.sponsorId, list);
    }

    const sponsors = userSponsors.map((sponsor) => {
      const sponsorDeals = dealsBySponsor.get(sponsor.id) ?? [];
      const activeDealCount = sponsorDeals.filter(
        (d) => d.status === "active"
      ).length;
      return {
        id: sponsor.id,
        name: sponsor.name,
        company: sponsor.company,
        email: sponsor.email,
        phone: sponsor.phone,
        notes: sponsor.notes,
        activeDealCount,
        totalDealCount: sponsorDeals.length,
        createdAt: sponsor.createdAt,
        updatedAt: sponsor.updatedAt,
      };
    });

    return NextResponse.json({ sponsors });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch sponsors" },
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

  const parsed = createSponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const userId = session.user.id;
    const sponsor = await createSponsor({
      ...parsed.data,
      userId,
    });
    return NextResponse.json({ sponsor }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create sponsor" },
      { status: 500 }
    );
  }
}
