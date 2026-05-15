import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SponsorsPage from "@/app/(dashboard)/sponsors/page";

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

const mockSponsors = [
  {
    id: "1",
    name: "Acme Corp",
    company: "Acme Inc",
    email: "contact@acme.com",
    phone: "+1234567890",
    activeDealCount: 2,
    totalDealCount: 5,
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "TechStart Inc",
    company: null,
    email: "hello@techstart.io",
    phone: null,
    activeDealCount: 0,
    totalDealCount: 1,
    createdAt: "2024-02-01T00:00:00.000Z",
  },
  {
    id: "3",
    name: "GreenCo",
    company: "GreenCo LLC",
    email: null,
    phone: "+9876543210",
    activeDealCount: 1,
    totalDealCount: 3,
    createdAt: "2024-03-10T00:00:00.000Z",
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

describe("SponsorsPage - useSession auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<SponsorsPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining("/login?callbackUrl="));
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();
    mockFetchSuccess({ sponsors: mockSponsors });

    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<SponsorsPage />);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { container } = render(<SponsorsPage />);

    expect(container.innerHTML).toBe("");
  });
});

describe("SponsorsPage - data fetching", () => {
  it("shows loading skeletons while fetching", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<SponsorsPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetches sponsors on mount and renders them", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("shows empty state when no sponsors are returned", async () => {
    mockFetchSuccess({ sponsors: [] });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("No sponsors yet")).toBeInTheDocument();
    });
  });

  it("handles sponsors response without sponsors property", async () => {
    mockFetchSuccess({});
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("No sponsors yet")).toBeInTheDocument();
    });
  });

  it("renders contact info for sponsors", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("contact@acme.com")).toBeInTheDocument();
    });
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
    expect(screen.getByText("hello@techstart.io")).toBeInTheDocument();
  });

  it("renders active deal count badges", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("2 active")).toBeInTheDocument();
    });
    expect(screen.getByText("0 active")).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();
  });
});

describe("SponsorsPage - error handling", () => {
  it("shows error state on fetch failure", async () => {
    mockFetchNetworkError();
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("shows error state on non-ok response", async () => {
    mockFetchError();
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  it("shows generic error message when error has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.reject("network failure")
    );

    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("retries fetching when Try again is clicked", async () => {
    mockFetchNetworkError();
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });
  });
});

describe("SponsorsPage - filtering", () => {
  it("filters sponsors by search query matching name", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search sponsors/i);
    fireEvent.change(input, { target: { value: "acme" } });

    await waitFor(() => {
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("filters sponsors by search query matching company", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search sponsors/i);
    fireEvent.change(input, { target: { value: "greenco llc" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
      expect(screen.queryByText("TechStart Inc")).not.toBeInTheDocument();
    });
    expect(screen.getByText("GreenCo")).toBeInTheDocument();
  });

  it("filters sponsors by search query matching email", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search sponsors/i);
    fireEvent.change(input, { target: { value: "techstart.io" } });

    await waitFor(() => {
      expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    });
    expect(screen.getByText("TechStart Inc")).toBeInTheDocument();
  });

  it("shows filtered empty state when no results match", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search sponsors/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No sponsors match your search")).toBeInTheDocument();
    });
  });

  it("clears search results when input is cleared", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Search sponsors/i);
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

describe("SponsorsPage - sorting", () => {
  it("renders sort dropdown with options", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("Sort sponsors");
    expect(select).toBeInTheDocument();
    expect(screen.getByText("Name (A-Z)")).toBeInTheDocument();
    expect(screen.getByText("Most active deals")).toBeInTheDocument();
  });

  function getSponsorNameElements(container: HTMLElement) {
    return Array.from(container.querySelectorAll("h3"))
      .filter((el) => el.textContent && ["Acme Corp", "TechStart Inc", "GreenCo"].includes(el.textContent));
  }

  it("sorts sponsors by name ascending by default", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    const { container } = render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const sponsorNames = getSponsorNameElements(container);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts sponsors by name descending", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    const { container } = render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort sponsors"), {
      target: { value: "name-desc" },
    });

    const sponsorNames = getSponsorNameElements(container);
    expect(sponsorNames[0]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("Acme Corp");
  });

  it("sorts sponsors by active deal count descending", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    const { container } = render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort sponsors"), {
      target: { value: "activeDealCount-desc" },
    });

    const sponsorNames = getSponsorNameElements(container);
    expect(sponsorNames[0]).toHaveTextContent("Acme Corp");
    expect(sponsorNames[1]).toHaveTextContent("GreenCo");
    expect(sponsorNames[2]).toHaveTextContent("TechStart Inc");
  });

  it("sorts sponsors by newest first", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    const { container } = render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Sort sponsors"), {
      target: { value: "createdAt-desc" },
    });

    const sponsorNames = getSponsorNameElements(container);
    expect(sponsorNames[0]).toHaveTextContent("GreenCo");
    expect(sponsorNames[1]).toHaveTextContent("TechStart Inc");
    expect(sponsorNames[2]).toHaveTextContent("Acme Corp");
  });
});

describe("SponsorsPage - navigation", () => {
  it("renders sponsor links to detail pages", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    const link = screen.getByText("Acme Corp").closest("a");
    expect(link).toHaveAttribute("href", "/dashboard/sponsors/1");
  });

  it("renders New Sponsor link", async () => {
    mockFetchSuccess({ sponsors: [] });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("New Sponsor")).toBeInTheDocument();
    });
    expect(screen.getByText("New Sponsor").closest("a")).toHaveAttribute(
      "href",
      "/dashboard/sponsors/new"
    );
  });

  it("renders New Sponsor link when sponsors are loaded", async () => {
    mockFetchSuccess({ sponsors: mockSponsors });
    render(<SponsorsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    expect(screen.getByText("New Sponsor")).toBeInTheDocument();
  });
});
