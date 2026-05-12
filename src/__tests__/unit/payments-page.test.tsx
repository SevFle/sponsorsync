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
    status: "pending",
    dueDate: "2099-06-15",
    paidDate: null,
    invoiceUrl: null,
    notes: "First installment",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    dealTitle: "Q2 Podcast Package",
    sponsorName: "Acme Corp",
  },
  {
    id: "p2",
    dealId: "d2",
    amount: 4500,
    currency: "USD",
    status: "paid",
    dueDate: "2024-01-01",
    paidDate: "2023-12-28",
    invoiceUrl: null,
    notes: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    dealTitle: "Newsletter Sponsorship",
    sponsorName: "TechStart Inc",
  },
  {
    id: "p3",
    dealId: "d3",
    amount: 6000,
    currency: "USD",
    status: "overdue",
    dueDate: "2020-01-01",
    paidDate: null,
    invoiceUrl: null,
    notes: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
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
    notes: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    dealTitle: "Cancelled Deal",
    sponsorName: "CancelledCo",
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

function mockFetchSuccess(data: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFetchError() {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
    json: () => Promise.resolve({}),
  } as Response);
}

function mockFetchNetworkError() {
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
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

describe("PaymentsPage - auth guard", () => {
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
    mockFetchSuccess({ payments: mockPayments });

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
  it("shows loading skeleton while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<PaymentsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetches payments on mount and renders them in table", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("shows empty state when no payments are returned", async () => {
    mockFetchSuccess({ payments: [] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });
  });

  it("handles payments response without payments property", async () => {
    mockFetchSuccess({});
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });
  });

  it("sends credentials: include in fetch request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ payments: [] }),
      } as Response);
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(callOpts.credentials).toBe("include");
  });
});

describe("PaymentsPage - summary cards", () => {
  it("shows total paid amount", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Paid")).toBeInTheDocument();
    });
    const paidAmounts = screen.getAllByText("$4,500");
    expect(paidAmounts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows outstanding amount", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Outstanding")).toBeInTheDocument();
    });
    expect(screen.getByText("$8,500")).toBeInTheDocument();
  });

  it("shows overdue count", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const overdueLabels = screen.getAllByText("Overdue");
    expect(overdueLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows zero overdue with neutral styling when none overdue", async () => {
    mockFetchSuccess({ payments: [mockPayments[0], mockPayments[1]] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

describe("PaymentsPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchNetworkError();
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchError();
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
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
    mockFetchNetworkError();
    mockFetchSuccess({ payments: mockPayments });
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
});

describe("PaymentsPage - filtering", () => {
  it("filters payments by Pending tab", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters payments by Paid tab", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paid" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters payments by Overdue tab", async () => {
    mockFetchSuccess({ payments: mockPayments });
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
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("CancelledCo")).toBeInTheDocument();
  });

  it("filters payments by Past Due tab showing overdue items", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Past Due" }));

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("CancelledCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("filters payments by search query matching sponsor name", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search payments/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters payments by search query matching deal title", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search payments/i);
    fireEvent.change(input, { target: { value: "newsletter" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters payments by search query matching status", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search payments/i);
    fireEvent.change(input, { target: { value: "overdue" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("filters payments by search query matching notes", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search payments/i);
    fireEvent.change(input, { target: { value: "first installment" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows filtered empty state when no results match", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search payments/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No payments match your filters")).toBeInTheDocument();
    });
  });

  it("shows All tab as active by default", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const allTab = screen.getByRole("button", { name: "All" });
    expect(allTab.className).toContain("bg-blue-500");
  });
});

describe("PaymentsPage - sorting", () => {
  it("renders sort dropdown with options", async () => {
    mockFetchSuccess({ payments: mockPayments });
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
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "amount-desc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|CancelledCo/);
    expect(sponsorNames[0]).toHaveTextContent("GreenCo");
    expect(sponsorNames[1]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[2]).toHaveTextContent("Acme Corp");
  });

  it("sorts payments by amount ascending", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "amount-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|CancelledCo/);
    expect(sponsorNames[0]).toHaveTextContent("CancelledCo");
    expect(sponsorNames[1]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts payments by sponsor name ascending", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort payments"), {
      target: { value: "sponsorName-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo|CancelledCo/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("CancelledCo");
    expect(sponsorNames[2]).toHaveTextContent("GreenCo");
    expect(sponsorNames[3]).toHaveTextContent("TechStart Inc");
  });
});

describe("PaymentsPage - status badges", () => {
  it("renders payment status badges in table rows", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const pendingBadges = screen.getAllByText("Pending");
    expect(pendingBadges.length).toBeGreaterThanOrEqual(1);
    const paidBadges = screen.getAllByText("Paid");
    expect(paidBadges.length).toBeGreaterThanOrEqual(1);
    const overdueBadges = screen.getAllByText("Overdue");
    expect(overdueBadges.length).toBeGreaterThanOrEqual(1);
    const cancelledBadges = screen.getAllByText("Cancelled");
    expect(cancelledBadges.length).toBeGreaterThanOrEqual(1);
  });
});

describe("PaymentsPage - record payment", () => {
  it("shows Record Payment button for pending payments", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    expect(recordButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Record Payment button for overdue payments", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("GreenCo")).toBeInTheDocument();
    });

    const recordButtons = screen.getAllByText("Record Payment");
    expect(recordButtons.length).toBe(2);
  });

  it("does not show Record Payment for paid payments", async () => {
    mockFetchSuccess({ payments: [mockPayments[1]] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    expect(screen.queryByText("Record Payment")).not.toBeInTheDocument();
  });

  it("does not show Record Payment for cancelled payments", async () => {
    mockFetchSuccess({ payments: [mockPayments[3]] });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("CancelledCo")).toBeInTheDocument();
    });

    expect(screen.queryByText("Record Payment")).not.toBeInTheDocument();
  });

  it("calls PATCH when Record Payment is clicked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ payments: [mockPayments[0]] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ payment: { ...mockPayments[0], status: "paid" } }),
      } as Response);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Record Payment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Record Payment"));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    const patchCall = fetchSpy.mock.calls[1]!;
    const [url, opts] = patchCall;
    expect(url).toContain("/api/payments/p1");
    expect(opts?.method).toBe("PATCH");
  });

  it("shows error message when recording payment fails", async () => {
    mockFetchSuccess({ payments: [mockPayments[0]] });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    } as Response);

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Record Payment")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Record Payment"));

    await waitFor(() => {
      expect(screen.getByText("Failed to record payment. Please try again.")).toBeInTheDocument();
    });
  });
});

describe("PaymentsPage - overdue indicators", () => {
  it("highlights overdue payment rows", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("GreenCo")).toBeInTheDocument();
    });

    const greenCoRow = screen.getByText("GreenCo").closest("tr");
    expect(greenCoRow?.className).toContain("bg-red-50");
  });

  it("shows overdue due date indicator", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("GreenCo")).toBeInTheDocument();
    });

    expect(screen.getByText(/Overdue by \d+d/)).toBeInTheDocument();
  });
});

describe("PaymentsPage - table structure", () => {
  it("renders table headers", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getByText("Sponsor")).toBeInTheDocument();
    expect(screen.getByText("Deal")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Due Date")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders deal title as link to deal page", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Q2 Podcast Package")).toBeInTheDocument();
    });

    const link = screen.getByText("Q2 Podcast Package").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/deals/d1");
  });

  it("renders formatted currency amounts", async () => {
    mockFetchSuccess({ payments: mockPayments });
    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getAllByText("$2,500").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$4,500").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$6,000").length).toBeGreaterThanOrEqual(1);
  });
});
