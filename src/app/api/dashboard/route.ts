import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { computeDashboardMetrics } from "@/lib/dashboard/metrics";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const [deals, deliverables, payments] = await Promise.all([
    getDealsByUserId(userId),
    getDeliverablesByUserId(userId),
    getPaymentsByUserId(userId),
  ]);

  const metrics = computeDashboardMetrics(deals, deliverables, payments);

  return NextResponse.json({ deals, deliverables, payments, metrics });
}
