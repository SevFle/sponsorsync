import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import NewSponsorPage from "@/app/(dashboard)/sponsors/new/page";

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
    constructor(status: number, message: string) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

import { useSession } from "next-auth/react";

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
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewSponsorPage - auth guard", () => {
  it("redirects to /login when session is unauthenticated", async () => {
    mockUnauthenticatedSession();

    render(<NewSponsorPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("does not redirect when session is authenticated", async () => {
    mockAuthenticatedSession();

    render(<NewSponsorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();

    render(<NewSponsorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders form when authenticated", async () => {
    mockAuthenticatedSession();

    render(<NewSponsorPage />);

    expect(screen.getByText("Add Sponsor")).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByText("Create Sponsor")).toBeInTheDocument();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();

    const { container } = render(<NewSponsorPage />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when session is unauthenticated", async () => {
    mockUnauthenticatedSession();

    const { container } = render(<NewSponsorPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });

    expect(container.innerHTML).toBe("");
  });
});
