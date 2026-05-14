import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { computePipelineSummary } from "@/lib/analytics";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const deals = await getDealsByUserId(userId);
  const summary = computePipelineSummary(
    deals.map((d) => ({
      status: d.status,
      totalValue: d.totalValue,
    }))
  );

  return NextResponse.json(summary);
}
