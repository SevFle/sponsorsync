export interface DashboardDeal {
  id: string;
  sponsorName: string;
  title: string;
  status: string;
  totalValue: number | null;
  currency: string;
  endDate: string | null;
}

export interface DashboardDeliverable {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  dealTitle?: string;
  sponsorName?: string;
}

export interface DashboardPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
  dealTitle?: string;
  sponsorName?: string;
}

export interface DashboardMetrics {
  activeDeals: number;
  draftDeals: number;
  completedDeals: number;
  revenueMtd: number;
  pendingDeliverables: number;
  overduePayments: number;
}

export interface DashboardData {
  deals: DashboardDeal[];
  deliverables: DashboardDeliverable[];
  payments: DashboardPayment[];
  metrics: DashboardMetrics;
}
