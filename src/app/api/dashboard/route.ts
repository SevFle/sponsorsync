import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const [deals, deliverables, payments] = await Promise.all([
    getDealsByUserId(userId),
    getDeliverablesByUserId(userId),
    getPaymentsByUserId(userId),
  ]);

  const activeDeals = deals.filter((d) => d.status === "active").length;
  const draftDeals = deals.filter((d) => d.status === "draft").length;
  const completedDeals = deals.filter((d) => d.status === "completed").length;

  const revenueMtd = payments
    .filter((p) => p.status === "paid" && p.paidDate)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingDeliverables = deliverables.filter(
    (d) => d.status === "pending" || d.status === "in_progress"
  ).length;

  const overduePayments = payments.filter(
    (p) =>
      p.status === "overdue" ||
      (p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date())
  ).length;

  return NextResponse.json({
    deals,
    deliverables,
    payments,
    metrics: {
      activeDeals,
      draftDeals,
      completedDeals,
      revenueMtd,
      pendingDeliverables,
      overduePayments,
    },
  });
}
