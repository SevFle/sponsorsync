import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DealsPage from "@/app/(dashboard)/deals/page";

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

const mockDeals = [
  {
    id: "1",
    sponsorName: "Acme Corp",
    title: "Q2 Podcast Package",
    description: "Big sponsorship",
    status: "active",
    totalValue: 12000,
    currency: "USD",
    endDate: "2099-06-15",
    progress: 70,
  },
  {
    id: "2",
    sponsorName: "TechStart Inc",
    title: "Newsletter Sponsorship",
    description: null,
    status: "draft",
    totalValue: 4500,
    currency: "USD",
    endDate: null,
    progress: 0,
  },
  {
    id: "3",
    sponsorName: "GreenCo",
    title: "Episode 40-45 Run",
    description: "Completed deal",
    status: "completed",
    totalValue: 6000,
    currency: "USD",
    endDate: "2024-01-01",
    progress: 100,
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

describe("DealsPage - useSession auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DealsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();
    mockFetchSuccess({ deals: mockDeals });

    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DealsPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DealsPage />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DealsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    expect(container.innerHTML).toBe("");
  });
});

describe("DealsPage - data fetching", () => {
  it("shows loading skeletons while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<DealsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetches deals on mount and renders them", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("shows empty state when no deals are returned", async () => {
    mockFetchSuccess({ deals: [] });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("No deals yet")).toBeInTheDocument();
    });
  });

  it("handles deals response without deals property", async () => {
    mockFetchSuccess({});
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("No deals yet")).toBeInTheDocument();
    });
  });

  it("sends credentials: include in fetch request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request, opts?: RequestInit) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ deals: [] }),
      } as Response);
    });

    render(<DealsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(callOpts.credentials).toBe("include");
  });

  it("renders deal count correctly", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/)).toHaveLength(3);
  });
});

describe("DealsPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchNetworkError();
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchError();
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  it("shows generic error message when error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject("network failure")
    );

    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchNetworkError();
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });

  it("does not set error state when fetch is aborted", async () => {
    let rejectFetch!: (reason?: unknown) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        rejectFetch = reject;
        (opts as RequestInit).signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }) as Promise<Response>;
    });

    const { unmount, container } = render(<DealsPage />);

    unmount();

    await waitFor(() => {
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });

  it("aborts fetch on unmount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<DealsPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("shows 401 error message from API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: "Unauthorized" }),
    } as Response);

    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });
});

describe("DealsPage - filtering", () => {
  it("filters deals by status tab", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Draft" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters deals by Active tab", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters deals by Completed tab", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("filters deals by Cancelled tab showing empty", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancelled" }));

    await waitFor(() => {
      expect(screen.getByText("No deals match your filters")).toBeInTheDocument();
    });
  });

  it("filters deals by search query matching sponsor name", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters deals by search query matching title", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "newsletter" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("GreenCo")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters deals by search query matching status", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "draft" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("filters deals by search query matching description", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "big sponsorship" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows filtered empty state when no results match", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No deals match your filters")).toBeInTheDocument();
    });
  });

  it("shows All Deals tab as active by default", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const allTab = screen.getByText("All Deals");
    expect(allTab.className).toContain("bg-blue-500");
  });

  it("clears search results when input is cleared", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });
});

describe("DealsPage - sorting", () => {
  it("renders sort dropdown with options", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Sort deals");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Deadline (nearest)")).toBeInTheDocument();
    expect(screen.getByText("Value (high to low)")).toBeInTheDocument();
    expect(screen.getByText("Sponsor (A-Z)")).toBeInTheDocument();
  });

  it("sorts deals by value descending", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "totalValue-desc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts deals by value ascending", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "totalValue-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("Acme Corp");
  });

  it("sorts deals by sponsor name ascending", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "sponsorName-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts deals by sponsor name descending", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "sponsorName-desc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("Acme Corp");
  });

  it("sorts deals by deadline nearest first (nulls last)", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "endDate-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("GreenCo");
    expect(sponsorNames[1]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts deals by deadline farthest first (nulls last)", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "endDate-desc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts deals by status ascending", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "status-asc" },
    });

    const sponsorNames = screen.getAllByText(/Acme Corp|TechStart Inc|GreenCo/);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("persists sort order when switching tabs", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "totalValue-desc" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    const select = screen.getByLabelText("Sort deals") as HTMLSelectElement;
    expect(select.value).toBe("totalValue-desc");
  });
});

describe("DealsPage - combined filters and sort", () => {
  it("applies search filter then sort on remaining deals", async () => {
    const dealsWithCloseValues = [
      ...mockDeals,
      {
        id: "4",
        sponsorName: "Acme Partner",
        title: "Co-branded Episode",
        description: null,
        status: "active",
        totalValue: 11500,
        currency: "USD",
        endDate: null,
        progress: 10,
      },
    ];
    mockFetchSuccess({ deals: dealsWithCloseValues });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Partner")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deals/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deals"), {
      target: { value: "totalValue-desc" },
    });

    const acmeDeals = screen.getAllByText(/Acme Corp|Acme Partner/);
    expect(acmeDeals[0]).toHaveTextContent("Acme Corp");
    expect(acmeDeals[1]).toHaveTextContent("Acme Partner");
  });
});

describe("DealsPage - navigation", () => {
  it("renders deal links to detail pages", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const link = screen.getByText("Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/deals/1");
  });

  it("renders New Deal link", async () => {
    mockFetchSuccess({ deals: [] });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("New Deal")).toBeInTheDocument();
    });
    expect(screen.getByText("New Deal").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/deals/new"
    );
  });

  it("renders New Deal link when deals are loaded", async () => {
    mockFetchSuccess({ deals: mockDeals });
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getByText("New Deal")).toBeInTheDocument();
  });
});
