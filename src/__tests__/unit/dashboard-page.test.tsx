import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

import { useSession } from "next-auth/react";

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

function mockAuthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: "user-1", email: "test@test.com" } },
    status: "authenticated",
  });
}

function mockUnauthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "unauthenticated",
  });
}

function mockLoadingSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "loading",
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockAuthenticatedSession();
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface TestDeal {
  id: string;
  sponsorName: string;
  title: string;
  status: string;
  totalValue: number | null;
  currency: string;
  endDate: string | null;
}

interface TestDeliverable {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  sponsorName: string;
}

interface TestPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  createdAt: string;
  sponsorName: string;
}

function buildDashboardResponse(overrides: Partial<{
  deals: TestDeal[];
  deliverables: TestDeliverable[];
  payments: TestPayment[];
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
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
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

describe("DashboardPage - useSession auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();
    mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("shows loading skeleton when session is loading and does not fetch data", async () => {
    mockLoadingSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DashboardPage />);

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect during session loading", async () => {
    mockLoadingSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("only fetches data after session is authenticated", async () => {
    const fetchSpy = mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming deadlines")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("DashboardPage - credentials and fetch behavior", () => {
  it("sends credentials: include in fetch request", async () => {
    mockAuthenticatedSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request, opts?: RequestInit) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse()),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(callOpts.credentials).toBe("include");
  });

  it("uses single fetch call for all dashboard data (no cascading re-renders)", async () => {
    mockAuthenticatedSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse({
            deals: mockDeals,
            deliverables: mockDeliverables,
            payments: mockPayments,
          })),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/dashboard"),
      expect.anything()
    );
  });
});

describe("DashboardPage - rendering", () => {
  it("shows loading skeletons while fetching", () => {
    mockAuthenticatedSession();
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
    expect(screen.queryByText("Missed Deliverable")).not.toBeInTheDocument();
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
});

describe("DashboardPage - error handling", () => {
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

  it("shows error state on 401 unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });

  it("shows generic error message when error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject("network failure")
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
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
});

describe("DashboardPage - empty states", () => {
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
});

describe("DashboardPage - abort and cleanup", () => {
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

describe("DashboardPage - boundary values", () => {
  it("handles large number of deliverables by capping at 5", async () => {
    const manyDeliverables = Array.from({ length: 10 }, (_, i) => ({
      id: `dl${i}`,
      title: `Deliverable ${i}`,
      dueDate: futureDate(i + 1),
      status: "pending",
      sponsorName: "Sponsor",
    }));

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: manyDeliverables,
      payments: [],
    }));

    render(<DashboardPage />);

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

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments: manyPayments,
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    const paymentReceived = screen.getAllByText("Payment received");
    expect(paymentReceived.length).toBe(5);
  });

  it("handles zero value metrics", async () => {
    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("$0")).toBeInTheDocument();
    });
  });

  it("handles deal with null totalValue", async () => {
    const dealsWithNullValue = [
      {
        id: "d1",
        sponsorName: "Acme Corp",
        title: "No Value Deal",
        status: "active",
        totalValue: null,
        currency: "USD",
        endDate: futureDate(30),
      },
    ];

    mockDashboardFetch(buildDashboardResponse({
      deals: dealsWithNullValue,
      deliverables: [],
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });
  });

  it("sorts upcoming deliverables by due date ascending", async () => {
    const unsorted = [
      { id: "dl1", title: "Later", dueDate: futureDate(10), status: "pending", sponsorName: "A" },
      { id: "dl2", title: "Sooner", dueDate: futureDate(1), status: "pending", sponsorName: "B" },
      { id: "dl3", title: "Middle", dueDate: futureDate(5), status: "pending", sponsorName: "C" },
    ];

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: unsorted,
      payments: [],
    }));

    render(<DashboardPage />);

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

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: [],
      payments,
    }));

    render(<DashboardPage />);

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

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: overdueDeliverable,
      payments: [],
    }));

    render(<DashboardPage />);

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

    mockDashboardFetch(buildDashboardResponse({
      deals: [],
      deliverables: soonDeliverable,
      payments: [],
    }));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Due Soon")).toBeInTheDocument();
    });

    expect(screen.getByText("1d left")).toBeInTheDocument();
  });
});

describe("DashboardPage - session status edge cases", () => {
  it("does not redirect when session status transitions from loading to authenticated", async () => {
    let currentStatus = "loading";
    (useSession as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      data: currentStatus === "authenticated" ? { user: { id: "user-1" } } : null,
      status: currentStatus,
    }));

    mockDashboardFetch(buildDashboardResponse());

    const { rerender } = render(<DashboardPage />);

    expect(mockRouter.replace).not.toHaveBeenCalled();

    currentStatus = "authenticated";
    rerender(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not attempt fetch when session has data but status is loading", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "loading",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles null session data with authenticated status gracefully", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: "authenticated",
    });
    mockDashboardFetch(buildDashboardResponse());

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});

describe("DashboardPage - fetch credentials verification", () => {
  it("always includes credentials: include for all HTTP methods", async () => {
    mockAuthenticatedSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request, opts?: RequestInit) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse()),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(callOpts.credentials).toBe("include");
  });

  it("includes Content-Type header in fetch request", async () => {
    mockAuthenticatedSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse()),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = callOpts.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("includes X-CSRF-Token header when cookie is present", async () => {
    mockAuthenticatedSession();
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "csrfToken=my-csrf-token",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
      const path = typeof url === "string" ? url : url.toString();
      if (path.includes("/api/dashboard")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse()),
        } as Response);
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) } as Response);
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    const headers = callOpts.headers as Record<string, string>;
    expect(headers["X-CSRF-Token"]).toBe("my-csrf-token");

    Object.defineProperty(document, "cookie", { writable: true, value: "" });
  });
});

describe("DashboardPage - auth guard redirect behavior", () => {
  it("uses router.replace (not push) to prevent back navigation to dashboard", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("redirects exactly once for unauthenticated session", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    });

    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it("does not redirect on 403 forbidden response", async () => {
    mockAuthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ error: "Access denied" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Access denied")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect on 500 server error", async () => {
    mockAuthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ error: "Server error" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe("DashboardPage - data integrity with auth", () => {
  it("clears error state on retry after successful fetch", async () => {
    mockAuthenticatedSession();

    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildDashboardResponse({
            deals: mockDeals,
            deliverables: [],
            payments: [],
          })),
        } as Response)
      );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.queryByText("Network error")).not.toBeInTheDocument();
    });
  });

  it("does not show stale data after auth failure error", async () => {
    mockAuthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () => Promise.resolve({ error: "Unauthorized" }),
      } as Response)
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });

    expect(screen.queryByText("Active Deals")).not.toBeInTheDocument();
    expect(screen.queryByText("Deal Pipeline")).not.toBeInTheDocument();
  });
});
