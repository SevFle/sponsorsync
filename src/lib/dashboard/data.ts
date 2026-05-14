import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";
import { computeDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard/metrics";

export interface DashboardDataResult {
  deals: Awaited<ReturnType<typeof getDealsByUserId>>;
  deliverables: Awaited<ReturnType<typeof getDeliverablesByUserId>>;
  payments: Awaited<ReturnType<typeof getPaymentsByUserId>>;
  metrics: DashboardMetrics;
}

export async function getDashboardData(userId: string): Promise<DashboardDataResult> {
  const [deals, deliverables, payments] = await Promise.all([
    getDealsByUserId(userId),
    getDeliverablesByUserId(userId),
    getPaymentsByUserId(userId),
  ]);

  const metrics = computeDashboardMetrics(deals, deliverables, payments);

  return { deals, deliverables, payments, metrics };
}
