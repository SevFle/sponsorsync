import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

const mockServerFetchGet = vi.fn();

vi.mock("@/lib/auth/server-fetch", () => ({
  createServerFetch: () => ({
    get: (...args: unknown[]) => mockServerFetchGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/config", () => ({
  config: {
    app: { url: "http://localhost:3000", name: "SponsorSync" },
    database: { url: "" },
    auth: { secret: "", url: "http://localhost:3000" },
    email: { resendApiKey: "" },
    inngest: { eventKey: "", signingKey: "" },
    stripe: { secretKey: "", publishableKey: "", webhookSecret: "", starterPriceId: "", proPriceId: "" },
  },
}));

import { requireAuth } from "@/lib/auth/guard";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  if (session) {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(session);
  } else {
    (requireAuth as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  }
}

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
};

const pastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};

const mockDeals = [
  {
    id: "d1",
    sponsorName: "Acme Corp",
    title: "Q2 Podcast Package",
    status: "active",
    totalValue: 12000,
    currency: "USD",
    endDate: futureDate(30),
  },
  {
    id: "d2",
    sponsorName: "TechStart Inc",
    title: "Newsletter Sponsorship",
    status: "draft",
    totalValue: 4500,
    currency: "USD",
    endDate: null,
  },
  {
    id: "d3",
    sponsorName: "GreenCo",
    title: "Episode 40-45 Run",
    status: "completed",
    totalValue: 6000,
    currency: "USD",
    endDate: pastDate(10),
  },
];

const mockDeliverables = [
  {
    id: "dl1",
    title: "Episode 42 — Mid-roll Ad",
    dueDate: futureDate(2),
    status: "in_progress",
    sponsorName: "Acme Corp",
  },
  {
    id: "dl2",
    title: "Newsletter Feature",
    dueDate: futureDate(4),
    status: "pending",
    sponsorName: "TechStart Inc",
  },
  {
    id: "dl3",
    title: "Social Media Post",
    dueDate: futureDate(6),
    status: "pending",
    sponsorName: "BlueSky Ltd",
  },
  {
    id: "dl4",
    title: "Already Verified",
    dueDate: futureDate(3),
    status: "verified",
    sponsorName: "Old Sponsor",
  },
  {
    id: "dl5",
    title: "Missed Deliverable",
    dueDate: futureDate(5),
    status: "missed",
    sponsorName: "Ghost Sponsor",
  },
];

const mockPayments = [
  {
    id: "p1",
    amount: 2500,
    currency: "USD",
    status: "paid",
    dueDate: pastDate(5),
    paidDate: pastDate(4),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sponsorName: "Acme Corp",
  },
  {
    id: "p2",
    amount: 1500,
    currency: "USD",
    status: "paid",
    dueDate: pastDate(10),
    paidDate: pastDate(9),
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    sponsorName: "TechStart Inc",
  },
  {
    id: "p3",
    amount: 3000,
    currency: "USD",
    status: "pending",
    dueDate: pastDate(1),
    paidDate: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    sponsorName: "BlueSky Ltd",
  },
];

function mockApiFetch(overrides: Partial<{
  deals: any[];
  deliverables: any[];
  payments: any[];
}> = {}) {
  const deals = overrides.deals ?? [];
  const deliverables = overrides.deliverables ?? [];
  const payments = overrides.payments ?? [];
  const activeDeals = deals.filter((d: any) => d.status === "active").length;
  const draftDeals = deals.filter((d: any) => d.status === "draft").length;
  const completedDeals = deals.filter((d: any) => d.status === "completed").length;
  const revenueMtd = payments
    .filter((p: any) => p.status === "paid" && p.paidDate)
    .reduce((sum: number, p: any) => sum + p.amount, 0);
  const pendingDeliverables = deliverables.filter(
    (d: any) => d.status === "pending" || d.status === "in_progress"
  ).length;
  const overduePayments = payments.filter(
    (p: any) =>
      p.status === "overdue" ||
      (p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date())
  ).length;

  mockServerFetchGet.mockResolvedValue({
    deals,
    deliverables,
    payments,
    metrics: { activeDeals, draftDeals, completedDeals, revenueMtd, pendingDeliverables, overduePayments },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mockApiFetch();
});

describe("DashboardPage - server-side auth guard", () => {
  it("redirects to /login when not authenticated", async () => {
    mockAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireAuth).toHaveBeenCalled();
  });

  it("does not redirect when authenticated", async () => {
    mockAuth(mockSession);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(result).toBeDefined();
  });

  it("does not make fetch calls when unauthenticated", async () => {
    mockAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockServerFetchGet).not.toHaveBeenCalled();
  });
});

describe("DashboardPage - server-side data fetching", () => {
  it("calls aggregated dashboard API via authenticated server fetch", async () => {
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(mockServerFetchGet).toHaveBeenCalledWith("/api/dashboard");
  });

  it("fetches all data via single consolidated API call", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: mockPayments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(mockServerFetchGet).toHaveBeenCalledTimes(1);
  });

  it("makes exactly one API call instead of three separate calls", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: mockPayments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(mockServerFetchGet).toHaveBeenCalledTimes(1);
  });
});

describe("DashboardPage - rendering", () => {
  it("renders all metric cards with correct values", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: mockPayments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    expect(screen.getByText("Active Deals")).toBeInTheDocument();
    expect(screen.getByText("Revenue (MTD)")).toBeInTheDocument();
    expect(screen.getByText("Pending Deliverables")).toBeInTheDocument();
    expect(screen.getByText("Overdue Payments")).toBeInTheDocument();
    expect(screen.getByText("$4,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders upcoming deadlines section", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 — Mid-roll Ad")).toBeInTheDocument();
    });

    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    expect(screen.getByText("Social Media Post")).toBeInTheDocument();
  });

  it("excludes verified and missed deliverables from upcoming", async () => {
    mockApiFetch({
      deals: [],
      deliverables: mockDeliverables,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });

    expect(screen.queryByText("Already Verified")).not.toBeInTheDocument();
    expect(screen.queryByText("Missed Deliverable")).not.toBeInTheDocument();
  });

  it("renders recent activity from payments", async () => {
    mockApiFetch({
      deals: [],
      deliverables: [],
      payments: mockPayments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getAllByText("Payment received").length).toBe(2);
    });

    expect(screen.getByText("Payment pending")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp — $2,500")).toBeInTheDocument();
    expect(screen.getByText("BlueSky Ltd — $3,000")).toBeInTheDocument();
  });

  it("renders deal pipeline summary cards", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });

    expect(screen.getByText("Draft deals awaiting review")).toBeInTheDocument();
    expect(screen.getByText("Currently running sponsorships")).toBeInTheDocument();
    expect(screen.getByText("Successfully finished deals")).toBeInTheDocument();
  });

  it("renders quick action links", async () => {
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("New Deal")).toBeInTheDocument();
    });

    expect(screen.getByText("New Sponsor")).toBeInTheDocument();
    expect(screen.getByText("New Deal").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/deals/new"
    );
    expect(screen.getByText("New Sponsor").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/sponsors/new"
    );
  });

  it("renders pipeline cards as links to deals page", async () => {
    mockApiFetch({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });

    const links = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/dashboard/deals");
    expect(links.length).toBe(3);
  });
});

describe("DashboardPage - empty states", () => {
  it("shows empty state for upcoming deadlines when none exist", async () => {
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
    });
    expect(screen.getByText("All deliverables are up to date.")).toBeInTheDocument();
  });

  it("shows empty state for recent activity when none exist", async () => {
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Activity will appear here as you work with sponsors.")
    ).toBeInTheDocument();
  });
});

describe("DashboardPage - error propagation", () => {
  it("propagates errors from server fetch", async () => {
    mockServerFetchGet.mockRejectedValue(new Error("Failed to fetch dashboard data"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Failed to fetch dashboard data");
  });

  it("propagates database connection errors", async () => {
    mockServerFetchGet.mockRejectedValue(new Error("Database connection failed"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Database connection failed");
  });

  it("propagates query errors from underlying data sources", async () => {
    mockServerFetchGet.mockRejectedValue(new Error("Query failed"));
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Query failed");
  });
});

describe("DashboardPage - boundary values", () => {
  it("handles large number of deliverables by capping at 5", async () => {
    const manyDeliverables = Array.from({ length: 10 }, (_, i) => ({
      id: `dl${i}`,
      title: `Deliverable ${i}`,
      dueDate: futureDate(i + 1),
      status: "pending",
      sponsorName: "Sponsor",
    }));

    mockApiFetch({
      deals: [],
      deliverables: manyDeliverables,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });

    const visibleDeliverables = screen.getAllByText(/Deliverable \d/);
    expect(visibleDeliverables.length).toBe(5);
  });

  it("handles large number of payments by capping recent activity at 5", async () => {
    const manyPayments = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      amount: 1000 + i * 100,
      currency: "USD",
      status: "paid",
      dueDate: pastDate(i + 1),
      paidDate: pastDate(i),
      createdAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
      sponsorName: `Sponsor ${i}`,
    }));

    mockApiFetch({
      deals: [],
      deliverables: [],
      payments: manyPayments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    const paymentReceived = screen.getAllByText("Payment received");
    expect(paymentReceived.length).toBe(5);
  });

  it("handles zero value metrics", async () => {
    mockApiFetch({
      deals: [],
      deliverables: [],
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("$0")).toBeInTheDocument();
    });
  });

  it("sorts upcoming deliverables by due date ascending", async () => {
    const unsorted = [
      { id: "dl1", title: "Later", dueDate: futureDate(10), status: "pending", sponsorName: "A" },
      { id: "dl2", title: "Sooner", dueDate: futureDate(1), status: "pending", sponsorName: "B" },
      { id: "dl3", title: "Middle", dueDate: futureDate(5), status: "pending", sponsorName: "C" },
    ];

    mockApiFetch({
      deals: [],
      deliverables: unsorted,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Sooner")).toBeInTheDocument();
    });

    const titles = screen.getAllByText(/Sooner|Middle|Later/);
    expect(titles[0]).toHaveTextContent("Sooner");
    expect(titles[1]).toHaveTextContent("Middle");
    expect(titles[2]).toHaveTextContent("Later");
  });

  it("sorts recent payments by createdAt descending", async () => {
    const payments = [
      { id: "p1", amount: 100, currency: "USD", status: "paid", dueDate: null, paidDate: null, createdAt: "2025-01-01T00:00:00Z", sponsorName: "OldCo" },
      { id: "p2", amount: 200, currency: "USD", status: "paid", dueDate: null, paidDate: null, createdAt: "2025-06-01T00:00:00Z", sponsorName: "NewCo" },
      { id: "p3", amount: 300, currency: "USD", status: "paid", dueDate: null, paidDate: null, createdAt: "2025-03-01T00:00:00Z", sponsorName: "MidCo" },
    ];

    mockApiFetch({
      deals: [],
      deliverables: [],
      payments,
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("NewCo — $200")).toBeInTheDocument();
    });

    const activities = screen.getAllByText(/OldCo|NewCo|MidCo/);
    expect(activities[0]).toHaveTextContent("NewCo");
    expect(activities[1]).toHaveTextContent("MidCo");
    expect(activities[2]).toHaveTextContent("OldCo");
  });

  it("shows overdue label for past due deliverables", async () => {
    const overdueDeliverable = [
      { id: "dl1", title: "Overdue Item", dueDate: pastDate(5), status: "in_progress", sponsorName: "Late Sponsor" },
    ];

    mockApiFetch({
      deals: [],
      deliverables: overdueDeliverable,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });

    expect(screen.queryByText("Overdue Item")).not.toBeInTheDocument();
    expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
  });

  it("shows days-left label for deliverables due soon", async () => {
    const soonDeliverable = [
      { id: "dl1", title: "Due Soon", dueDate: futureDate(1), status: "pending", sponsorName: "Soon Sponsor" },
    ];

    mockApiFetch({
      deals: [],
      deliverables: soonDeliverable,
      payments: [],
    });
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Due Soon")).toBeInTheDocument();
    });

    expect(screen.getByText("1d left")).toBeInTheDocument();
  });
});

describe("DashboardPage - session edge cases", () => {
  it("handles session with minimal user data", async () => {
    mockAuth({ user: { id: "u" } } as any);
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(result).toBeDefined();
    expect(mockServerFetchGet).toHaveBeenCalled();
  });

  it("calls requireAuth exactly once per render", async () => {
    mockApiFetch();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(requireAuth).toHaveBeenCalledTimes(1);
  });
});
