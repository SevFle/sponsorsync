import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DealsPage from "@/app/(dashboard)/deals/page";

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

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchSuccess(data: unknown) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFetchError() {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: () => Promise.resolve({}),
  } as Response);
}

function mockFetchNetworkError() {
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
}

describe("DealsPage", () => {
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
      expect(screen.getByText("Failed to fetch deals")).toBeInTheDocument();
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

  it("handles deals response without deals property", async () => {
    mockFetchSuccess({});
    render(<DealsPage />);

    await waitFor(() => {
      expect(screen.getByText("No deals yet")).toBeInTheDocument();
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
    await waitFor(() => {
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    unmount();

    await waitFor(() => {
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });
  });
});
