import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { computeDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard/metrics";
import type { DashboardDeal, DashboardDeliverable, DashboardPayment } from "@/types/dashboard";

function isValidUserId(userId: string): boolean {
  return typeof userId === "string" && userId.trim().length > 0;
}

function normalizeUserId(userId: string): string {
  return userId.trim();
}

export interface DashboardDataResult {
  deals: DashboardDeal[];
  deliverables: DashboardDeliverable[];
  payments: DashboardPayment[];
  metrics: DashboardMetrics;
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  if (!isValidUserId(userId)) {
    throw new Error("Invalid user ID: authentication required");
  }

  const normalizedId = normalizeUserId(userId);

  const results = await Promise.allSettled([
    getDealsByUserId(normalizedId),
    getDeliverablesByUserId(normalizedId),
    getPaymentsByUserId(normalizedId),
    getSponsorsByUserId(normalizedId),
  ]);

  const [dealsResult, deliverablesResult, paymentsResult, sponsorsResult] = results;

  if (dealsResult.status === "rejected") {
    throw new Error(`Failed to load deals: ${dealsResult.reason instanceof Error ? dealsResult.reason.message : "Unknown error"}`);
  }
  if (sponsorsResult.status === "rejected") {
    throw new Error(`Failed to load sponsors: ${sponsorsResult.reason instanceof Error ? sponsorsResult.reason.message : "Unknown error"}`);
  }

  const deals = dealsResult.value;
  const sponsors = sponsorsResult.value;
  const deliverables = deliverablesResult.status === "fulfilled" ? deliverablesResult.value : [];
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : [];

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
