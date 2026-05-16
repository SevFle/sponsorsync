import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import TemplateDetailPage from "@/app/(dashboard)/templates/[id]/page";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
};

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: "template-1" }),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/components/templates/TemplateEditor", () => ({
  TemplateEditor: () => <div>Template Editor</div>,
}));

vi.mock("@/components/templates/TemplatePreview", () => ({
  TemplatePreview: () => <div>Template Preview</div>,
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
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

const mockTemplate = {
  template: {
    id: "template-1",
    name: "Welcome Email",
    subject: "Welcome!",
    body: "Hello {{name}}",
    category: "onboarding",
    isDefault: false,
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2024-01-15T00:00:00.000Z",
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

describe("TemplateDetailPage - auth guard via useAuth", () => {
  it("redirects to login with callbackUrl when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplateDetailPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl=")
      );
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockTemplate);

    render(<TemplateDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplateDetailPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplateDetailPage />);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows spinner when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<TemplateDetailPage />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows spinner when unauthenticated (before redirect)", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<TemplateDetailPage />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

describe("TemplateDetailPage - data fetching", () => {
  it("fetches and renders template data", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockTemplate);

    render(<TemplateDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    });
    expect(screen.getByText("Template Editor")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Failed to load template")
    );

    render(<TemplateDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load template")).toBeInTheDocument();
    });
  });
});
