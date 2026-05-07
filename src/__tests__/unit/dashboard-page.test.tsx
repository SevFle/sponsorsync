import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";

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

beforeEach(() => {
  vi.restoreAllMocks();
});

function buildDashboardResponse(overrides: Partial<{
  deals: typeof mockDeals;
  deliverables: typeof mockDeliverables;
  payments: typeof mockPayments;
  metrics: Record<string, number>;
}> = {}) {
  const deals = overrides.deals ?? [];
  const deliverables = overrides.deliverables ?? [];
  const payments = overrides.payments ?? [];

  const metrics = overrides.metrics ?? {
    activeDeals: deals.filter((d) => d.status === "active").length,
    draftDeals: deals.filter((d) => d.status === "draft").length,
    completedDeals: deals.filter((d) => d.status === "completed").length,
    revenueMtd: payments
      .filter((p) => p.status === "paid" && p.paidDate)
      .reduce((sum, p) => sum + p.amount, 0),
    pendingDeliverables: deliverables.filter(
      (d) => d.status === "pending" || d.status === "in_progress"
    ).length,
    overduePayments: payments.filter(
      (p) =>
        p.status === "overdue" ||
        (p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date())
    ).length,
  };

  return { deals, deliverables, payments, metrics };
}

function mockDashboardFetch(data: ReturnType<typeof buildDashboardResponse>) {
  vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
    const path = typeof url === "string" ? url : url.toString();
    if (path.includes("/api/dashboard")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      } as Response);
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response);
  });
}

function mockFetchError() {
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
}

function mockFetchNonOk() {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Failed to load dashboard data" }),
    } as Response)
  );
}

describe("DashboardPage", () => {
  it("shows loading skeletons while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<DashboardPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders all metric cards with correct values", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: mockPayments,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });

    expect(screen.getByText("Revenue (MTD)")).toBeInTheDocument();
    expect(screen.getByText("Pending Deliverables")).toBeInTheDocument();
    expect(screen.getByText("Overdue Payments")).toBeInTheDocument();
    expect(screen.getByText("$4,000")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("computes active deals count correctly", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });

    const metricCards = screen.getAllByText("1");
    expect(metricCards.length).toBeGreaterThanOrEqual(1);
  });

  it("computes revenue MTD from paid payments", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments: mockPayments,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Revenue (MTD)")).toBeInTheDocument();
    });

    expect(screen.getByText("$4,000")).toBeInTheDocument();
  });

  it("computes overdue payments count", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments: mockPayments,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Payments")).toBeInTheDocument();
    });

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders upcoming deadlines section", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: mockDeliverables,
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 — Mid-roll Ad")).toBeInTheDocument();
    });

    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    expect(screen.getByText("Social Media Post")).toBeInTheDocument();
  });

  it("excludes verified and missed deliverables from upcoming", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: mockDeliverables,
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Upcoming Deadlines")).toBeInTheDocument();
    });

    expect(screen.queryByText("Already Verified")).not.toBeInTheDocument();
  });

  it("renders recent activity from payments", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments: mockPayments,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Payment received").length).toBe(2);
    });

    expect(screen.getByText("Payment pending")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp — $2,500")).toBeInTheDocument();
    expect(screen.getByText("BlueSky Ltd — $3,000")).toBeInTheDocument();
  });

  it("renders deal pipeline summary cards", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });

    expect(screen.getByText("Draft deals awaiting review")).toBeInTheDocument();
    expect(screen.getByText("Currently running sponsorships")).toBeInTheDocument();
    expect(screen.getByText("Successfully finished deals")).toBeInTheDocument();
  });

  it("renders quick action links", async () => {
    mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

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

  it("shows error state on fetch failure", async () => {
    mockFetchError();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchNonOk();
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard data")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchError();

    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });
  });

  it("shows empty state for upcoming deadlines when none exist", async () => {
    mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
    });
    expect(screen.getByText("All deliverables are up to date.")).toBeInTheDocument();
  });

  it("shows empty state for recent activity when none exist", async () => {
    mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Activity will appear here as you work with sponsors.")
    ).toBeInTheDocument();
  });

  it("handles null/undefined arrays from API", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: undefined as any,
      deliverables: undefined as any,
      payments: undefined as any,
      metrics: {
        activeDeals: 0,
        draftDeals: 0,
        completedDeals: 0,
        revenueMtd: 0,
        pendingDeliverables: 0,
        overduePayments: 0,
      },
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
    });
  });

  it("aborts fetch on unmount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("does not set error state when fetch is aborted", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        (opts as RequestInit).signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }) as Promise<Response>;
    });

    const { unmount, container } = render(<DashboardPage />);
    await waitFor(() => {
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    unmount();

    await waitFor(() => {
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  it("renders pipeline cards as links to deals page", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: mockDeals,
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });

    const links = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/dashboard/deals");
    expect(links.length).toBe(3);
  });
});
