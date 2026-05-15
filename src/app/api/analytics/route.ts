import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import {
  computeRevenueSummary,
  computePipelineSummary,
  computeDeliverableMetrics,
  computeTrendSummary,
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/analytics";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const preset = (searchParams.get("range") ?? "30d") as DateRangePreset;
  const range = resolveDateRange(preset);

  const [deals, payments, deliverables] = await Promise.all([
    getDealsByUserId(userId),
    getPaymentsByUserId(userId),
    getDeliverablesByUserId(userId),
  ]);

  const paymentLike = payments.map((p) => ({
    amount: p.amount,
    status: p.status,
    paidDate: p.paidDate,
    dueDate: p.dueDate,
    currency: p.currency ?? null,
  }));

  const dealLike = deals.map((d) => ({
    status: d.status,
    totalValue: d.totalValue,
  }));

  const deliverableLike = deliverables.map((d) => ({
    status: d.status,
    dueDate: d.dueDate,
    completedDate: d.completedDate,
  }));

  const revenue = computeRevenueSummary(paymentLike, range);
  const pipeline = computePipelineSummary(dealLike);
  const deliverableMetrics = computeDeliverableMetrics(deliverableLike, range);
  const trends = computeTrendSummary(
    paymentLike,
    dealLike,
    deals.map((d) =>
      d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt)
    ),
    deliverableLike
  );

  return NextResponse.json({ revenue, pipeline, deliverables: deliverableMetrics, trends });
}
