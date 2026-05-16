import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import EditSponsorPage from "@/app/(dashboard)/sponsors/[id]/edit/page";

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

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    body: Record<string, unknown>;
    constructor(status: number, message: string, body: Record<string, unknown> = {}) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

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

const mockSponsor = {
  sponsor: {
    id: "sponsor-1",
    name: "Acme Corp",
    company: "Acme Inc",
    email: "contact@acme.com",
    phone: "+1234567890",
    notes: "Important sponsor",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EditSponsorPage - auth guard via useAuth", () => {
  it("redirects to login with callbackUrl when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl=")
      );
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockSponsor);

    render(<EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Sponsor")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />
    );

    expect(container.innerHTML).toBe("");
  });
});

describe("EditSponsorPage - data fetching", () => {
  it("fetches sponsor data and populates form", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockSponsor);

    render(<EditSponsorPage params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Acme Inc")).toBeInTheDocument();
    expect(screen.getByDisplayValue("contact@acme.com")).toBeInTheDocument();
  });
});
