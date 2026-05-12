interface DealLike {
  status: string;
}

interface DeliverableLike {
  status: string;
}

interface PaymentLike {
  status: string;
  amount: number;
  paidDate: string | null;
  dueDate: string | null;
}

export interface DashboardMetrics {
  activeDeals: number;
  draftDeals: number;
  completedDeals: number;
  revenueMtd: number;
  pendingDeliverables: number;
  overduePayments: number;
}

export function computeDashboardMetrics(
  deals: DealLike[],
  deliverables: DeliverableLike[],
  payments: PaymentLike[]
): DashboardMetrics {
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

  return {
    activeDeals,
    draftDeals,
    completedDeals,
    revenueMtd,
    pendingDeliverables,
    overduePayments,
  };
}
