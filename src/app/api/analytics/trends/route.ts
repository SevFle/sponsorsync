import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { computeTrendSummary } from "@/lib/analytics";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const [deals, payments, deliverables] = await Promise.all([
    getDealsByUserId(userId),
    getPaymentsByUserId(userId),
    getDeliverablesByUserId(userId),
  ]);

  const summary = computeTrendSummary(
    payments.map((p) => ({
      amount: p.amount,
      status: p.status,
      paidDate: p.paidDate,
      dueDate: p.dueDate,
      currency: p.currency ?? null,
    })),
    deals.map((d) => ({ status: d.status, totalValue: d.totalValue })),
    deals.map((d) => d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt)),
    deliverables.map((d) => ({
      status: d.status,
      dueDate: d.dueDate,
      completedDate: d.completedDate,
    }))
  );

  return NextResponse.json(summary);
}
