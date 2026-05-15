import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { computeDeadlineStatus } from "@/lib/deliverables/engine";
import { computeDeliverableMetrics } from "@/lib/analytics";
import { createDeliverableSchema } from "@/domain/deliverables";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [deliverables, userDeals, userSponsors] = await Promise.all([
      getDeliverablesByUserId(userId),
      getDealsByUserId(userId),
      getSponsorsByUserId(userId),
    ]);

    const dealMap = new Map(userDeals.map((d) => [d.id, d]));
    const sponsorMap = new Map(userSponsors.map((s) => [s.id, s]));

    const enriched = deliverables.map((d) => {
      const deal = dealMap.get(d.dealId);
      const sponsor = deal ? sponsorMap.get(deal.sponsorId) : undefined;
      const deadlineStatus = computeDeadlineStatus(
        d.dueDate,
        d.completedDate,
        d.status
      );

      return {
        id: d.id,
        dealId: d.dealId,
        title: d.title,
        description: d.description,
        status: d.status,
        dueDate: d.dueDate,
        completedDate: d.completedDate,
        verificationData: d.verificationData,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        dealTitle: deal?.title ?? "Unknown Deal",
        sponsorName: sponsor?.name ?? "Unknown",
        deadlineStatus,
      };
    });

    const metrics = computeDeliverableMetrics(
      deliverables.map((d) => ({
        status: d.status,
        dueDate: d.dueDate,
        completedDate: d.completedDate,
      }))
    );

    return NextResponse.json({
      deliverables: enriched,
      metrics: {
        total: metrics.total,
        completionRate: metrics.completionRate,
        onTimeRate: metrics.onTimeRate,
        overdueCount: metrics.overdueCount,
        verifiedCount: metrics.verifiedCount,
        statusCounts: metrics.statusCounts,
      },
    });
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
