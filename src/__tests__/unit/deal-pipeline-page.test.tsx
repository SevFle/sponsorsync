import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DealPipelinePage from "@/app/(dashboard)/deals/pipeline/page";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

const mockDeals = [
  {
    id: "deal-1",
    sponsorName: "Acme Corp",
    title: "Q2 Podcast Package",
    description: null,
    status: "draft" as const,
    totalValue: 12000,
    currency: "USD",
    endDate: "2099-12-31",
    progress: 30,
  },
  {
    id: "deal-2",
    sponsorName: "TechStart Inc",
    title: "Newsletter Sponsorship",
    description: "Monthly newsletter",
    status: "proposed" as const,
    totalValue: 5000,
    currency: "USD",
    endDate: "2099-06-01",
    progress: 0,
  },
  {
    id: "deal-3",
    sponsorName: "GreenCo",
    title: "Episode 40-45 Run",
    description: null,
    status: "active" as const,
    totalValue: 8000,
    currency: "USD",
    endDate: null,
    progress: 60,
  },
  {
    id: "deal-4",
    sponsorName: "BlueSky Media",
    title: "Completed Deal",
    description: null,
    status: "completed" as const,
    totalValue: 3000,
    currency: "USD",
    endDate: "2024-06-01",
    progress: 100,
  },
];

function mockAuthenticated() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: "user-1", email: "test@test.com" } },
    status: "authenticated",
  });
}

function mockUnauthenticated() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "unauthenticated",
  });
}

function mockLoading() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: null,
    status: "loading",
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  mockAuthenticated();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DealPipelinePage - auth guard", () => {
  it("returns null when unauthenticated", () => {
    mockUnauthenticated();
    const { container } = render(<DealPipelinePage />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when session is loading", () => {
    mockLoading();
    vi.spyOn({ apiFetch }, "apiFetch").mockResolvedValue({ deals: [] });
    const { container } = render(<DealPipelinePage />);
    expect(container.innerHTML).toBe("");
  });
});

describe("DealPipelinePage - data fetching", () => {
  it("shows loading skeletons while fetching", () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { container } = render(<DealPipelinePage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders pipeline columns with deals", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: mockDeals });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
    expect(screen.getByText("BlueSky Media")).toBeInTheDocument();
  });

  it("shows empty state when no deals exist", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("No deals in pipeline")).toBeInTheDocument();
    });
  });

  it("shows empty state when deals response is undefined", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({});
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("No deals in pipeline")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows generic error on non-Error rejection", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue("string error");
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("retries fetch when Try again is clicked", async () => {
    (apiFetch as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({ deals: mockDeals });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });
});

describe("DealPipelinePage - pipeline columns", () => {
  it("renders all four pipeline column headers", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: mockDeals });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Draft")).toBeInTheDocument();
    });
    expect(screen.getByText("Proposed")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows deal count per column", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: mockDeals });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const countBadges = screen.getAllByText("1");
    expect(countBadges.length).toBeGreaterThanOrEqual(4);
  });

  it("shows Drop deals here for empty columns", async () => {
    const onlyDraft = [mockDeals[0]];
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: onlyDraft });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const dropHints = screen.getAllByText("Drop deals here");
    expect(dropHints.length).toBeGreaterThanOrEqual(3);
  });

  it("formats currency for deal amounts", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: mockDeals });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("$12,000")).toBeInTheDocument();
    });
    expect(screen.getByText("$5,000")).toBeInTheDocument();
    expect(screen.getByText("$8,000")).toBeInTheDocument();
  });

  it("shows due date for deals with endDate", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[1]] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it("does not show due date for deals without endDate", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[2]] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("GreenCo")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
  });

  it("shows progress bar for deals with progress > 0", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[2]] });
    const { container } = render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("GreenCo")).toBeInTheDocument();
    });

    const progressBars = container.querySelectorAll('[style*="width: 60%"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("does not show progress bar for deals with 0 progress", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[1]] });
    const { container } = render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    });

    expect(container.querySelector('[class*="bg-blue-400"]')).toBeNull();
  });
});

describe("DealPipelinePage - drag and drop", () => {
  it("deal cards are draggable", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[0]] });
    const { container } = render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const card = container.querySelector("[draggable]");
    expect(card).toBeTruthy();
  });

  it("updates deal optimistically on drop", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [mockDeals[0]] });
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ deals: [mockDeals[0]] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const dealCard = screen.getByText("Acme Corp").closest("[draggable]");
    expect(dealCard).toBeTruthy();

    fireEvent.dragStart(dealCard!, {
      dataTransfer: { effectAllowed: "", setData: vi.fn(), getData: vi.fn(() => "deal-1") },
    });

    const proposedDropZone = screen.getAllByText("Drop deals here")[0];
    fireEvent.dragOver(proposedDropZone, {
      dataTransfer: { dropEffect: "" },
    });

    fireEvent.drop(proposedDropZone, {
      dataTransfer: {
        getData: vi.fn(() => "deal-1"),
      },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/deals/deal-1/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "proposed" }),
      })
    );
  });
});

describe("DealPipelinePage - page header", () => {
  it("renders page title and description", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Deal Pipeline")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Drag and drop deals between stages to update their status.")
    ).toBeInTheDocument();
  });

  it("renders New Deal button", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("New Deal")).toBeInTheDocument();
    });
    expect(screen.getByText("New Deal").closest("a")).toHaveAttribute("href", "/dashboard/deals/new");
  });

  it("renders back to list view link", async () => {
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: [] });
    render(<DealPipelinePage />);

    await waitFor(() => {
      const link = screen.getByText(/Back to list view/);
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "/dashboard/deals");
    });
  });
});

describe("DealPipelinePage - cancelled deals excluded", () => {
  it("does not show cancelled deals in pipeline columns", async () => {
    const withCancelled = [
      ...mockDeals,
      {
        id: "deal-cancelled",
        sponsorName: "Cancelled Sponsor",
        title: "Cancelled Deal",
        description: null,
        status: "cancelled" as const,
        totalValue: 1000,
        currency: "USD",
        endDate: null,
        progress: 0,
      },
    ];
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ deals: withCancelled });
    render(<DealPipelinePage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.queryByText("Cancelled Sponsor")).not.toBeInTheDocument();
  });
});
