import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DeliverablesPage from "@/app/(dashboard)/deliverables/page";

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

vi.mock("date-fns", () => ({
  differenceInDays: (d1: Date, d2: Date) =>
    Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)),
  isPast: (d: Date) => d < new Date(),
  startOfDay: (d: Date) => d,
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

const mockDeliverables = [
  {
    id: "dl-1",
    dealId: "deal-1",
    title: "Episode 42 Ad Read",
    description: "60-second mid-roll ad",
    status: "pending",
    dueDate: futureDate(5),
    completedDate: null,
    notes: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    sponsorName: "Acme Corp",
    sponsorId: "sp-1",
    dealTitle: "Q2 Podcast Package",
  },
  {
    id: "dl-2",
    dealId: "deal-2",
    title: "Newsletter Feature",
    description: null,
    status: "in_progress",
    dueDate: futureDate(2),
    completedDate: null,
    notes: null,
    createdAt: "2025-01-02T00:00:00Z",
    updatedAt: "2025-01-02T00:00:00Z",
    sponsorName: "TechStart Inc",
    sponsorId: "sp-2",
    dealTitle: "Newsletter Sponsorship",
  },
  {
    id: "dl-3",
    dealId: "deal-3",
    title: "Social Media Post",
    description: "Instagram story mention",
    status: "submitted",
    dueDate: futureDate(1),
    completedDate: null,
    notes: null,
    createdAt: "2025-01-03T00:00:00Z",
    updatedAt: "2025-01-03T00:00:00Z",
    sponsorName: "GreenCo",
    sponsorId: "sp-3",
    dealTitle: "Green Campaign",
  },
  {
    id: "dl-4",
    dealId: "deal-4",
    title: "Verified Post",
    description: null,
    status: "verified",
    dueDate: pastDate(2),
    completedDate: pastDate(3),
    notes: null,
    createdAt: "2025-01-04T00:00:00Z",
    updatedAt: "2025-01-04T00:00:00Z",
    sponsorName: "BlueSky Ltd",
    sponsorId: "sp-4",
    dealTitle: "Blue Deal",
  },
  {
    id: "dl-5",
    dealId: "deal-5",
    title: "Missed Deliverable",
    description: null,
    status: "missed",
    dueDate: pastDate(10),
    completedDate: null,
    notes: null,
    createdAt: "2025-01-05T00:00:00Z",
    updatedAt: "2025-01-05T00:00:00Z",
    sponsorName: "Ghost Sponsor",
    sponsorId: "sp-5",
    dealTitle: "Ghost Deal",
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
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
    new Error("Network error")
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

describe("DeliverablesPage - useSession auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();
    mockFetchSuccess({ deliverables: mockDeliverables });

    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(new Promise(() => {}));

    render(<DeliverablesPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DeliverablesPage />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<DeliverablesPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    expect(container.innerHTML).toBe("");
  });
});

describe("DeliverablesPage - data fetching", () => {
  it("shows loading skeletons while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<DeliverablesPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetches deliverables on mount and renders them", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });
    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    expect(screen.getByText("Social Media Post")).toBeInTheDocument();
  });

  it("shows empty state when no deliverables are returned", async () => {
    mockFetchSuccess({ deliverables: [] });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("No deliverables yet")).toBeInTheDocument();
    });
  });

  it("handles response without deliverables property", async () => {
    mockFetchSuccess({});
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("No deliverables yet")).toBeInTheDocument();
    });
  });

  it("sends credentials: include in fetch request", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        (_url: string | URL | Request, opts?: RequestInit) => {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ deliverables: [] }),
          } as Response);
        }
      );

    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const callOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(callOpts.credentials).toBe("include");
  });
});

describe("DeliverablesPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchNetworkError();
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchError();
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Internal Server Error")
      ).toBeInTheDocument();
    });
  });

  it("shows generic error message when error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject("network failure")
    );

    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchNetworkError();
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });
  });

  it("does not set error state when fetch is aborted", async () => {
    let rejectFetch!: (reason?: unknown) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, opts) => {
      return new Promise((_resolve, reject) => {
        rejectFetch = reject;
        (opts as RequestInit).signal?.addEventListener("abort", () => {
          reject(
            new DOMException("The operation was aborted.", "AbortError")
          );
        });
      }) as Promise<Response>;
    });

    const { unmount } = render(<DeliverablesPage />);

    unmount();

    await waitFor(() => {
      expect(
        screen.queryByText("Something went wrong")
      ).not.toBeInTheDocument();
    });
  });

  it("aborts fetch on unmount", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<DeliverablesPage />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const signal = fetchSpy.mock.calls[0]![1]!.signal as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
});

describe("DeliverablesPage - status badges", () => {
  it("renders correct status badge labels", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("In Progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Submitted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Verified").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Missed").length).toBeGreaterThanOrEqual(1);
  });
});

describe("DeliverablesPage - deadline indicators", () => {
  it("shows overdue indicator for past due dates on non-completed items", async () => {
    const overdueDeliverable = [
      {
        ...mockDeliverables[0],
        id: "dl-overdue",
        title: "Overdue Item",
        status: "pending",
        dueDate: pastDate(5),
      },
    ];
    mockFetchSuccess({ deliverables: overdueDeliverable });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Overdue Item")).toBeInTheDocument();
    });

    expect(screen.getByText("Overdue (5d)")).toBeInTheDocument();
  });

  it("shows days-left indicator for upcoming due dates", async () => {
    const upcomingDeliverable = [
      {
        ...mockDeliverables[0],
        id: "dl-soon",
        title: "Due Soon Item",
        status: "pending",
        dueDate: futureDate(2),
      },
    ];
    mockFetchSuccess({ deliverables: upcomingDeliverable });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Due Soon Item")).toBeInTheDocument();
    });

    expect(screen.getByText(/2d left/)).toBeInTheDocument();
  });

  it("does not show deadline indicator for verified items", async () => {
    const verifiedDeliverable = [
      {
        ...mockDeliverables[0],
        id: "dl-verified",
        title: "Already Verified",
        status: "verified",
        dueDate: pastDate(5),
        completedDate: pastDate(6),
      },
    ];
    mockFetchSuccess({ deliverables: verifiedDeliverable });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Already Verified")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/d left/)).not.toBeInTheDocument();
  });

  it("does not show deadline indicator for submitted items", async () => {
    const submittedDeliverable = [
      {
        ...mockDeliverables[0],
        id: "dl-submitted",
        title: "Submitted Item",
        status: "submitted",
        dueDate: pastDate(2),
      },
    ];
    mockFetchSuccess({ deliverables: submittedDeliverable });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Submitted Item")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });

  it("does not show deadline indicator when dueDate is null", async () => {
    const noDueDateDeliverable = [
      {
        ...mockDeliverables[0],
        id: "dl-no-due",
        title: "No Due Date",
        dueDate: null,
      },
    ];
    mockFetchSuccess({ deliverables: noDueDateDeliverable });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("No Due Date")).toBeInTheDocument();
    });

    expect(screen.queryByText(/d left/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Overdue/)).not.toBeInTheDocument();
  });
});

describe("DeliverablesPage - sponsor association", () => {
  it("displays sponsor name as a link", async () => {
    mockFetchSuccess({ deliverables: [mockDeliverables[0]] });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const sponsorLink = screen.getByText("Acme Corp").closest("a");
    expect(sponsorLink).toHaveAttribute("href", "/dashboard/sponsors/sp-1");
  });

  it("displays deal title under deliverable title", async () => {
    mockFetchSuccess({ deliverables: [mockDeliverables[0]] });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Q2 Podcast Package")).toBeInTheDocument();
    });
  });
});

describe("DeliverablesPage - filtering", () => {
  it("filters by status tab", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(screen.queryByText("Newsletter Feature")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
  });

  it("filters by In Progress tab", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));

    await waitFor(() => {
      expect(screen.queryByText("Episode 42 Ad Read")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
  });

  it("filters by Verified tab", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Verified" }));

    await waitFor(() => {
      expect(screen.queryByText("Episode 42 Ad Read")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Verified Post")).toBeInTheDocument();
  });

  it("filters by Missed tab", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Missed" }));

    await waitFor(() => {
      expect(screen.queryByText("Episode 42 Ad Read")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Missed Deliverable")).toBeInTheDocument();
  });

  it("filters by search query matching title", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "newsletter" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Episode 42 Ad Read")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
  });

  it("filters by search query matching sponsor name", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Newsletter Feature")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters by search query matching description", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "mid-roll" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Newsletter Feature")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
  });

  it("filters by search query matching status", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "in_progress" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Episode 42 Ad Read")
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
  });

  it("shows filtered empty state when no results match", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(
        screen.getByText("No deliverables match your filters")
      ).toBeInTheDocument();
    });
  });

  it("shows All tab as active by default", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const allTab = screen.getByText("All");
    expect(allTab.className).toContain("bg-blue-500");
  });

  it("clears search results when input is cleared", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search deliverables/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(
        screen.queryByText("Newsletter Feature")
      ).not.toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    });
    expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
  });
});

describe("DeliverablesPage - sorting", () => {
  it("renders sort dropdown with options", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Sort deliverables");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Deadline (nearest)")).toBeInTheDocument();
    expect(screen.getByText("Sponsor (A-Z)")).toBeInTheDocument();
  });

  it("sorts by sponsor name ascending", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deliverables"), {
      target: { value: "sponsorName-asc" },
    });

    const sponsorNames = screen.getAllByText(
      /Acme Corp|TechStart Inc|GreenCo|BlueSky Ltd|Ghost Sponsor/
    );
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("BlueSky Ltd");
    expect(sponsorNames[2]).toHaveTextContent("Ghost Sponsor");
  });

  it("sorts by sponsor name descending", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deliverables"), {
      target: { value: "sponsorName-desc" },
    });

    const sponsorNames = screen.getAllByText(
      /Acme Corp|TechStart Inc|GreenCo|BlueSky Ltd|Ghost Sponsor/
    );
    expect(sponsorNames[0]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("Ghost Sponsor");
  });

  it("sorts by deadline nearest first (nulls last)", async () => {
    const deliverablesWithNull = [
      {
        ...mockDeliverables[0],
        dueDate: futureDate(10),
      },
      {
        ...mockDeliverables[1],
        dueDate: futureDate(2),
      },
      {
        ...mockDeliverables[2],
        dueDate: null,
      },
    ];
    mockFetchSuccess({ deliverables: deliverablesWithNull });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deliverables"), {
      target: { value: "dueDate-asc" },
    });

    const titles = screen.getAllByText(
      /Episode 42 Ad Read|Newsletter Feature|Social Media Post/
    );
    expect(titles[0]).toHaveTextContent("Newsletter Feature");
    expect(titles[1]).toHaveTextContent("Episode 42 Ad Read");
    expect(titles[2]).toHaveTextContent("Social Media Post");
  });

  it("sorts by status ascending", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deliverables"), {
      target: { value: "status-asc" },
    });

    const titles = screen.getAllByText(
      /Episode 42 Ad Read|Newsletter Feature|Social Media Post|Verified Post|Missed Deliverable/
    );
    expect(titles[0]).toHaveTextContent("Newsletter Feature");
    expect(titles[1]).toHaveTextContent("Missed Deliverable");
    expect(titles[2]).toHaveTextContent("Episode 42 Ad Read");
    expect(titles[3]).toHaveTextContent("Social Media Post");
    expect(titles[4]).toHaveTextContent("Verified Post");
  });

  it("persists sort order when switching tabs", async () => {
    mockFetchSuccess({ deliverables: mockDeliverables });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Episode 42 Ad Read")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort deliverables"), {
      target: { value: "sponsorName-desc" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Newsletter Feature")
      ).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText(
      "Sort deliverables"
    ) as HTMLSelectElement;
    expect(select.value).toBe("sponsorName-desc");
  });
});

describe("DeliverablesPage - description rendering", () => {
  it("renders description when present", async () => {
    mockFetchSuccess({ deliverables: [mockDeliverables[0]] });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("60-second mid-roll ad")).toBeInTheDocument();
    });
  });

  it("does not render description element when null", async () => {
    mockFetchSuccess({ deliverables: [mockDeliverables[1]] });
    render(<DeliverablesPage />);

    await waitFor(() => {
      expect(screen.getByText("Newsletter Feature")).toBeInTheDocument();
    });

    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});
