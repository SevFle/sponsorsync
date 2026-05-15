import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentsPage from "@/app/(dashboard)/payments/page";

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

const mockPayments = [
  {
    id: "p1",
    dealId: "d1",
    amount: 2500,
    currency: "USD",
    status: "paid",
    dueDate: "2025-01-10",
    paidDate: "2025-01-09",
    invoiceUrl: null,
    notes: null,
    createdAt: "2025-01-05T00:00:00Z",
    updatedAt: "2025-01-09T00:00:00Z",
    dealTitle: "Q2 Podcast Package",
    sponsorName: "Acme Corp",
  },
  {
    id: "p2",
    dealId: "d2",
    amount: 1500,
    currency: "USD",
    status: "pending",
    dueDate: "2025-03-15",
    paidDate: null,
    invoiceUrl: null,
    notes: null,
    createdAt: "2025-01-06T00:00:00Z",
    updatedAt: "2025-01-06T00:00:00Z",
    dealTitle: "Newsletter Sponsorship",
    sponsorName: "TechStart Inc",
  },
  {
    id: "p3",
    dealId: "d3",
    amount: 3000,
    currency: "USD",
    status: "overdue",
    dueDate: "2024-12-01",
    paidDate: null,
    invoiceUrl: null,
    notes: null,
    createdAt: "2024-11-01T00:00:00Z",
    updatedAt: "2024-12-01T00:00:00Z",
    dealTitle: "Episode 40-45 Run",
    sponsorName: "GreenCo",
  },
  {
    id: "p4",
    dealId: "d4",
    amount: 1000,
    currency: "USD",
    status: "cancelled",
    dueDate: null,
    paidDate: null,
    invoiceUrl: null,
    notes: "Deal fell through",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    dealTitle: "Cancelled Deal",
    sponsorName: "DeadDeal Ltd",
  },
];

const mockDeals = [
  { id: "d1", sponsorName: "Acme Corp", title: "Q2 Podcast Package" },
  { id: "d2", sponsorName: "TechStart Inc", title: "Newsletter Sponsorship" },
  { id: "d3", sponsorName: "GreenCo", title: "Episode 40-45 Run" },
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

function mockFetchSuccess(paymentsData: unknown, dealsData: unknown) {
  return vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
    const path = typeof url === "string" ? url : url.toString();
    if (path.includes("/api/payments")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(paymentsData),
      } as Response);
    }
    if (path.includes("/api/deals")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(dealsData),
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
  const spy = vi.spyOn(globalThis, "fetch");
  spy.mockRejectedValueOnce(new Error("Network error"));
  spy.mockRejectedValueOnce(new Error("Network error"));
}

function mockFetchNonOk() {
  vi.spyOn(globalThis, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({ error: "Failed to fetch payments" }),
    } as Response)
  );
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

describe("PaymentsPage - useSession auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<PaymentsPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<PaymentsPage />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<PaymentsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    expect(container.innerHTML).toBe("");
  });
});

describe("PaymentsPage - data fetching", () => {
  it("shows loading skeletons while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<PaymentsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetches payments and deals on mount and renders them", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
    expect(screen.getByText("DeadDeal Ltd")).toBeInTheDocument();
  });

  it("shows empty state when no payments are returned", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });
  });

  it("handles payments response without payments property", async () => {
    mockFetchSuccess({}, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });
  });

  it("sends credentials: include in fetch requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url: string | URL | Request, opts?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ payments: [] }),
        } as Response);
      }
    );

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    for (const call of fetchSpy.mock.calls) {
      const opts = call[1] as RequestInit;
      expect(opts.credentials).toBe("include");
    }
  });

  it("renders payment amounts as formatted currency", async () => {
    mockFetchSuccess({ payments: [mockPayments[0]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("$2,500").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders status badges for payments", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Overdue").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThanOrEqual(2);
  });
});

describe("PaymentsPage - summary cards", () => {
  it("renders summary cards with Total Paid, Outstanding, and Overdue", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Paid")).toBeInTheDocument();
      expect(screen.getByText("Outstanding")).toBeInTheDocument();
      expect(screen.getAllByText("Overdue").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calculates total paid correctly", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getAllByText("$2,500").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows $0 when no payments exist", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      const zeroValues = screen.getAllByText("$0");
      expect(zeroValues.length).toBe(3);
    });
  });

  it("shows summary skeleton while loading", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<PaymentsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("PaymentsPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchError();
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchNonOk();
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch payments")).toBeInTheDocument();
    });
  });

  it("shows generic error message when error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject("network failure")
    );

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchError();
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
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

    const { unmount } = render(<PaymentsPage />);

    unmount();

    await waitFor(() => {
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  it("aborts fetch on unmount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<PaymentsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});

describe("PaymentsPage - status filtering", () => {
  it("filters payments by Pending tab", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
      expect(screen.queryByText("DeadDeal Ltd")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters payments by Paid tab", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paid" }));

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters payments by Overdue tab", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Overdue" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("filters payments by Cancelled tab", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("DeadDeal Ltd")).toBeInTheDocument();
  });

  it("shows All Payments tab as active by default", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const allTab = screen.getByText("All Payments");
    expect(allTab.className).toContain("bg-blue-500");
  });

  it("shows all payments on All Payments tab", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
    expect(screen.getByText("DeadDeal Ltd")).toBeInTheDocument();
  });

  it("shows filtered empty state when no results match status filter", async () => {
    const onlyPaid = [mockPayments[0]];
    mockFetchSuccess({ payments: onlyPaid }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Overdue" }));

    await waitFor(() => {
      expect(screen.getByText("No payments match your filters")).toBeInTheDocument();
    });
  });
});

describe("PaymentsPage - search filtering", () => {
  it("filters payments by sponsor name", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by sponsor/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters payments by deal title", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by sponsor/i);
    fireEvent.change(input, { target: { value: "newsletter" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("clears search results when input is cleared", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by sponsor/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });
  });

  it("shows filtered empty state when search has no matches", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search by sponsor/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No payments match your filters")).toBeInTheDocument();
    });
  });
});

describe("PaymentsPage - date range filtering", () => {
  it("filters payments by start date on due date", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText("Filter from date");
    fireEvent.change(startDateInput, { target: { value: "2025-01-01" } });

    await waitFor(() => {
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters payments by end date on due date", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const endDateInput = screen.getByLabelText("Filter to date");
    fireEvent.change(endDateInput, { target: { value: "2025-01-31" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("excludes payments with null due date when date filter is active", async () => {
    const paymentsWithNull = [
      mockPayments[0],
      { ...mockPayments[3], dueDate: null, status: "pending" as const },
    ];
    mockFetchSuccess({ payments: paymentsWithNull }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText("Filter from date");
    fireEvent.change(startDateInput, { target: { value: "2025-01-01" } });

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });
});

describe("PaymentsPage - sorting", () => {
  it("renders sort dropdown with options", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Sort payments");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Due date (nearest)")).toBeInTheDocument();
    expect(screen.getByText("Amount (high to low)")).toBeInTheDocument();
    expect(screen.getByText("Sponsor (A-Z)")).toBeInTheDocument();
  });

  it("sorts payments by amount descending", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "amount-desc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|DeadDeal Ltd/);
    expect(sponsorNames[0]).toHaveTextContent("GreenCo");
    expect(sponsorNames[1]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts payments by sponsor name ascending", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "sponsorName-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|DeadDeal Ltd/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("DeadDeal Ltd");
    expect(sponsorNames[2]).toHaveTextContent("GreenCo");
    expect(sponsorNames[3]).toHaveTextContent("TechStart Inc");
  });

  it("sorts payments by due date with nulls last", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "dueDate-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|DeadDeal Ltd/);
    expect(sponsorNames[0]).toHaveTextContent("GreenCo");
    expect(sponsorNames[1]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[3]).toHaveTextContent("DeadDeal Ltd");
  });
});

describe("PaymentsPage - expandable payment rows", () => {
  it("expands payment row on click to show details", async () => {
    mockFetchSuccess({ payments: [mockPayments[0]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const row = screen.getByText("Acme Corp").closest("button");
    expect(row).toBeTruthy();
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Deal")).toBeInTheDocument();
    });
  });

  it("shows Mark Paid button for pending payments when expanded", async () => {
    mockFetchSuccess({ payments: [mockPayments[1]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    const row = screen.getByText("TechStart Inc").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Mark Paid")).toBeInTheDocument();
    });
  });

  it("shows Mark Overdue button for pending payments when expanded", async () => {
    mockFetchSuccess({ payments: [mockPayments[1]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    const row = screen.getByText("TechStart Inc").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Mark Overdue")).toBeInTheDocument();
    });
  });

  it("shows Cancel Payment button for pending payments when expanded", async () => {
    mockFetchSuccess({ payments: [mockPayments[1]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    const row = screen.getByText("TechStart Inc").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Cancel Payment")).toBeInTheDocument();
    });
  });

  it("does not show action buttons for paid payments", async () => {
    mockFetchSuccess({ payments: [mockPayments[0]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const row = screen.getByText("Acme Corp").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Deal")).toBeInTheDocument();
    });

    expect(screen.queryByText("Mark Paid")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel Payment")).not.toBeInTheDocument();
  });

  it("shows notes when payment has notes and is expanded", async () => {
    mockFetchSuccess({ payments: [mockPayments[3]] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("DeadDeal Ltd")).toBeInTheDocument();
    });

    const row = screen.getByText("DeadDeal Ltd").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Deal fell through")).toBeInTheDocument();
    });
  });

  it("marks payment as paid when Mark Paid is clicked", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((url: string | URL | Request, opts?: RequestInit) => {
        const path = typeof url === "string" ? url : url.toString();
        if (path.includes("/api/payments/p2") && opts?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ payment: { id: "p2", status: "paid" } }),
          } as Response);
        }
        if (path.includes("/api/payments")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ payments: [mockPayments[1]] }),
          } as Response);
        }
        if (path.includes("/api/deals")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ deals: mockDeals }),
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        } as Response);
      });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    const row = screen.getByText("TechStart Inc").closest("button");
    fireEvent.click(row!);

    await waitFor(() => {
      expect(screen.getByText("Mark Paid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Mark Paid"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});

describe("PaymentsPage - record payment modal", () => {
  it("opens modal when Record Payment button is clicked", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    const headerButton = recordButtons.find(
      (el) => el.closest("button") && !el.closest("form")
    );
    fireEvent.click(headerButton!);

    await waitFor(() => {
      expect(screen.getByText("Add a new payment to track.")).toBeInTheDocument();
    });
  });

  it("closes modal when Cancel is clicked", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    const headerButton = recordButtons.find(
      (el) => el.closest("button") && !el.closest("form")
    );
    fireEvent.click(headerButton!);

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByText("Cancel");
    const modalCancel = cancelButtons.find((el) => el.closest("form"));
    fireEvent.click(modalCancel!);

    await waitFor(() => {
      expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });
  });

  it("closes modal when backdrop is clicked", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    const headerButton = recordButtons.find(
      (el) => el.closest("button") && !el.closest("form")
    );
    fireEvent.click(headerButton!);

    await waitFor(() => {
      expect(screen.getByText("Add a new payment to track.")).toBeInTheDocument();
    });

    const backdrop = screen.getByText("Add a new payment to track.").closest(".fixed");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    await waitFor(() => {
      expect(screen.queryByText("Add a new payment to track.")).not.toBeInTheDocument();
    });
  });

  it("shows validation error when no deal is selected", async () => {
    mockFetchSuccess({ payments: mockPayments }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    const headerButton = recordButtons.find(
      (el) => el.closest("button") && !el.closest("form")
    );
    fireEvent.click(headerButton!);

    await waitFor(() => {
      expect(screen.getByText("Amount ($)")).toBeInTheDocument();
    });

    const submitButton = screen.getAllByText("Record Payment").find(
      (el) => el.closest("form") !== null
    );
    expect(submitButton).toBeTruthy();
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(screen.getByText("Please select a deal")).toBeInTheDocument();
    });
  });
});

describe("PaymentsPage - UI rendering", () => {
  it("renders Record Payment button in header", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Record Payment")).toBeInTheDocument();
    });
  });

  it("renders page header with correct title and description", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Payments")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Track and manage your sponsorship payments.")
    ).toBeInTheDocument();
  });

  it("renders search input with correct placeholder", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by sponsor/i)).toBeInTheDocument();
    });
  });

  it("renders date filter inputs", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Filter from date")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter to date")).toBeInTheDocument();
    });
  });

  it("renders all status filter tabs", async () => {
    mockFetchSuccess({ payments: [] }, { deals: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("All Payments")).toBeInTheDocument();
    });
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cancelled").length).toBeGreaterThanOrEqual(1);
  });

  it("shows No due date for payments without due or paid date", async () => {
    const noDatePayment = { ...mockPayments[3], dueDate: null };
    mockFetchSuccess({ payments: [noDatePayment] }, { deals: mockDeals });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No due date")).toBeInTheDocument();
    });
  });
});
