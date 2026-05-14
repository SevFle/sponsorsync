import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

const mockApiFetch = vi.fn();
const mockApiError = class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: mockApiError,
}));

import { useSession } from "next-auth/react";

function mockAuthenticatedSession() {
  (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { user: { id: "user-1", email: "test@test.com" } },
    status: "authenticated",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

describe("NewSponsorPage - form submission error handling", () => {
  it("extracts field errors from ApiError.body.details on 422", async () => {
    mockAuthenticatedSession();
    mockApiFetch.mockRejectedValue(
      new mockApiError(422, "Validation failed", {
        error: "Validation failed",
        details: { name: ["is required"], email: ["is invalid"] },
      })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/new/page"
    );

    render(<Page />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "test" } });

    const submitButton = screen.getByText("Create Sponsor");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("is required")).toBeInTheDocument();
      expect(screen.getByText("is invalid")).toBeInTheDocument();
    });
  });

  it("shows error message when 422 has no details in body", async () => {
    mockAuthenticatedSession();
    mockApiFetch.mockRejectedValue(
      new mockApiError(422, "Validation failed", {
        error: "Validation failed",
      })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/new/page"
    );

    render(<Page />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "test" } });

    const submitButton = screen.getByText("Create Sponsor");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });
  });

  it("shows generic error message on non-422 errors", async () => {
    mockAuthenticatedSession();
    mockApiFetch.mockRejectedValue(
      new mockApiError(500, "Internal Server Error", {
        error: "Internal Server Error",
      })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/new/page"
    );

    render(<Page />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "test" } });

    const submitButton = screen.getByText("Create Sponsor");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
    });
  });

  it("does not make duplicate fetch calls on 422 error", async () => {
    mockAuthenticatedSession();
    mockApiFetch.mockRejectedValue(
      new mockApiError(422, "Validation failed", {
        details: { name: ["is required"] },
      })
    );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/new/page"
    );

    render(<Page />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "test" } });

    await act(async () => {
      fireEvent.click(screen.getByText("Create Sponsor"));
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });
});

describe("EditSponsorPage - form submission error handling", () => {
  it("extracts field errors from ApiError.body.details on 422", async () => {
    mockAuthenticatedSession();
    mockApiFetch
      .mockResolvedValueOnce({
        sponsor: {
          id: "sponsor-1",
          name: "Test Sponsor",
          company: null,
          email: null,
          phone: null,
          notes: null,
        },
      })
      .mockRejectedValueOnce(
        new mockApiError(422, "Validation failed", {
          error: "Validation failed",
          details: { email: ["is invalid"] },
        })
      );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/[id]/edit/page"
    );

    render(<Page params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Sponsor")).toBeInTheDocument();
    });

    const submitButton = screen.getByText("Save Changes");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText("is invalid")).toBeInTheDocument();
    });
  });

  it("extracts field errors from ApiError.body.details on 400", async () => {
    mockAuthenticatedSession();
    mockApiFetch
      .mockResolvedValueOnce({
        sponsor: {
          id: "sponsor-1",
          name: "Test Sponsor",
          company: null,
          email: null,
          phone: null,
          notes: null,
        },
      })
      .mockRejectedValueOnce(
        new mockApiError(400, "Bad Request", {
          error: "Bad Request",
          details: { name: ["cannot be empty"] },
        })
      );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/[id]/edit/page"
    );

    render(<Page params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Sponsor")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });

    await waitFor(() => {
      expect(screen.getByText("cannot be empty")).toBeInTheDocument();
    });
  });

  it("shows error message when 422 has no details", async () => {
    mockAuthenticatedSession();
    mockApiFetch
      .mockResolvedValueOnce({
        sponsor: {
          id: "sponsor-1",
          name: "Test Sponsor",
          company: null,
          email: null,
          phone: null,
          notes: null,
        },
      })
      .mockRejectedValueOnce(
        new mockApiError(422, "Validation failed", {
          error: "Validation failed",
        })
      );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/[id]/edit/page"
    );

    render(<Page params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Sponsor")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });

    await waitFor(() => {
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });
  });

  it("does not make duplicate fetch calls on error", async () => {
    mockAuthenticatedSession();
    mockApiFetch
      .mockResolvedValueOnce({
        sponsor: {
          id: "sponsor-1",
          name: "Test Sponsor",
          company: null,
          email: null,
          phone: null,
          notes: null,
        },
      })
      .mockRejectedValueOnce(
        new mockApiError(422, "Validation failed", {
          details: { name: ["is required"] },
        })
      );

    const { default: Page } = await import(
      "@/app/(dashboard)/sponsors/[id]/edit/page"
    );

    render(<Page params={Promise.resolve({ id: "sponsor-1" })} />);

    await waitFor(() => {
      expect(screen.getByText("Edit Sponsor")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });
});
