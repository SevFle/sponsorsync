import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { computeDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard/metrics";
import type { DashboardDeal, DashboardDeliverable, DashboardPayment } from "@/types/dashboard";

export interface DashboardDataResult {
  deals: DashboardDeal[];
  deliverables: DashboardDeliverable[];
  payments: DashboardPayment[];
  metrics: DashboardMetrics;
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  if (!userId?.trim()) {
    throw new Error("Invalid user ID: authentication required");
  }

  const [deals, deliverables, payments, sponsors] = await Promise.all([
    getDealsByUserId(userId),
    getDeliverablesByUserId(userId),
    getPaymentsByUserId(userId),
    getSponsorsByUserId(userId),
  ]);

  const sponsorMap = new Map(sponsors.map((s) => [s.id, s]));
  const dealMap = new Map(deals.map((d) => [d.id, d]));

  const enrichedDeals: DashboardDeal[] = deals.map((deal) => {
    const sponsor = sponsorMap.get(deal.sponsorId);
    return {
      id: deal.id,
      sponsorName: sponsor?.name ?? "Unknown",
      title: deal.title,
      status: deal.status,
      totalValue: deal.totalValue,
      currency: deal.currency ?? "USD",
      endDate: deal.endDate,
    };
  });

  const enrichedDeliverables: DashboardDeliverable[] = deliverables.map((d) => {
    const deal = dealMap.get(d.dealId);
    const sponsor = deal ? sponsorMap.get(deal.sponsorId) : undefined;
    return {
      id: d.id,
      title: d.title,
      dueDate: d.dueDate,
      status: d.status,
      dealTitle: deal?.title,
      sponsorName: sponsor?.name,
    };
  });

  const enrichedPayments: DashboardPayment[] = payments.map((p) => {
    const deal = dealMap.get(p.dealId);
    const sponsor = deal ? sponsorMap.get(deal.sponsorId) : undefined;
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency ?? "USD",
      status: p.status,
      dueDate: p.dueDate,
      paidDate: p.paidDate,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt ?? ""),
      dealTitle: deal?.title,
      sponsorName: sponsor?.name,
    };
  });

  const metrics = computeDashboardMetrics(enrichedDeals, enrichedDeliverables, enrichedPayments);

  return { deals: enrichedDeals, deliverables: enrichedDeliverables, payments: enrichedPayments, metrics };
}
