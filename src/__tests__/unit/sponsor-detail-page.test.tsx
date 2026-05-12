import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SponsorDetailPage from "@/app/(dashboard)/sponsors/[id]/page";

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

const SPONSOR_ID = "550e8400-e29b-41d4-a716-446655440000";

const mockSponsorDetail = {
  sponsor: {
    id: SPONSOR_ID,
    name: "Acme Corp",
    company: "Acme Inc",
    email: "contact@acme.com",
    phone: "+1234567890",
    notes: "Premium sponsor with special terms.",
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
  },
  deals: [
    {
      id: "deal-1",
      title: "Q2 Podcast Package",
      description: "Big sponsorship",
      status: "active",
      totalValue: 12000,
      currency: "USD",
      startDate: "2024-04-01",
      endDate: "2024-06-30",
      createdAt: "2024-01-15T00:00:00.000Z",
      updatedAt: "2024-01-15T00:00:00.000Z",
    },
    {
      id: "deal-2",
      title: "Newsletter Sponsorship",
      description: null,
      status: "completed",
      totalValue: 4500,
      currency: "USD",
      startDate: null,
      endDate: null,
      createdAt: "2024-02-01T00:00:00.000Z",
      updatedAt: "2024-02-01T00:00:00.000Z",
    },
  ],
};

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

function mockFetchSuccess(data: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  } as Response);
}

function mockFetchError(status = 500, statusText = "Internal Server Error") {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({ error: statusText }),
  } as Response);
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

describe("SponsorDetailPage - auth guard", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });
});

describe("SponsorDetailPage - data fetching", () => {
  it("shows loading state while fetching", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(
      <SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />
    );
    await waitFor(() => {
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  it("renders sponsor details after fetching", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("renders contact information", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("contact@acme.com")).toBeInTheDocument();
    });
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
  });

  it("renders notes section", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Premium sponsor with special terms.")).toBeInTheDocument();
    });
  });

  it("shows no contact info message when missing", async () => {
    const noContact = {
      ...mockSponsorDetail,
      sponsor: {
        ...mockSponsorDetail.sponsor,
        email: null,
        phone: null,
      },
    };
    mockFetchSuccess(noContact);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("No contact info added.")).toBeInTheDocument();
    });
  });

  it("shows no notes message when missing", async () => {
    const noNotes = {
      ...mockSponsorDetail,
      sponsor: {
        ...mockSponsorDetail.sponsor,
        notes: null,
      },
    };
    mockFetchSuccess(noNotes);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("No notes added.")).toBeInTheDocument();
    });
  });
});

describe("SponsorDetailPage - deal history", () => {
  it("renders deal history section", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Deal History (2)")).toBeInTheDocument();
    });
    expect(screen.getByText("Q2 Podcast Package")).toBeInTheDocument();
    expect(screen.getByText("Newsletter Sponsorship")).toBeInTheDocument();
  });

  it("renders deal values", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("$12,000")).toBeInTheDocument();
    });
    expect(screen.getByText("$4,500")).toBeInTheDocument();
  });

  it("renders deal status badges", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders deal links to deal detail pages", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Q2 Podcast Package")).toBeInTheDocument();
    });

    const link = screen.getByText("Q2 Podcast Package").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/deals/deal-1");
  });

  it("shows empty state when no deals", async () => {
    const noDeals = {
      ...mockSponsorDetail,
      deals: [],
    };
    mockFetchSuccess(noDeals);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("No deals yet")).toBeInTheDocument();
    });
    expect(screen.getByText("Create a deal with this sponsor to get started.")).toBeInTheDocument();
  });
});

describe("SponsorDetailPage - navigation", () => {
  it("renders back link to sponsors list", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText(/Back to Sponsors/)).toBeInTheDocument();
    });
    const backLink = screen.getByText(/Back to Sponsors/).closest("a");
    expect(backLink).toHaveAttribute("href", "/dashboard/sponsors");
  });

  it("renders edit link", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
    });
    const editLink = screen.getByText("Edit").closest("a");
    expect(editLink).toHaveAttribute("href", `/dashboard/sponsors/${SPONSOR_ID}/edit`);
  });

  it("renders delete button", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  it("renders Add Deal link", async () => {
    mockFetchSuccess(mockSponsorDetail);
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Add Deal")).toBeInTheDocument();
    });
    const addDealLink = screen.getByText("Add Deal").closest("a");
    expect(addDealLink).toHaveAttribute("href", `/dashboard/deals/new?sponsorId=${SPONSOR_ID}`);
  });
});

describe("SponsorDetailPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchError(404, "Sponsor not found");
    render(<SponsorDetailPage params={Promise.resolve({ id: SPONSOR_ID })} />);

    await waitFor(() => {
      expect(screen.getByText("Sponsor not found")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });
});
