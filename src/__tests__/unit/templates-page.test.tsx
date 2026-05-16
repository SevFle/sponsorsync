import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import TemplatesPage from "@/app/(dashboard)/templates/page";

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
}));

vi.mock("@/components/templates/TemplateList", () => ({
  TemplateList: ({ templates }: { templates: Array<{ id: string; name: string }> }) => (
    <div data-testid="template-list">
      {templates.map((t) => (
        <div key={t.id}>{t.name}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TemplatesPage - auth guard via useAuth", () => {
  it("redirects to login when unauthenticated", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl=")
      );
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      templates: [],
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Templates")).toBeInTheDocument();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplatesPage />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not fetch data when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<TemplatesPage />);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("renders nothing when session is loading", async () => {
    mockLoadingSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<TemplatesPage />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when unauthenticated (before redirect completes)", async () => {
    mockUnauthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<TemplatesPage />);

    expect(container.innerHTML).toBe("");
  });
});

describe("TemplatesPage - data fetching", () => {
  it("fetches templates and renders them", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      templates: [
        { id: "1", name: "Welcome Email", subject: "Hi", body: "Hello", category: "onboarding", isDefault: false },
        { id: "2", name: "Follow Up", subject: "Following up", body: "Hi again", category: "follow-up", isDefault: true },
      ],
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Welcome Email")).toBeInTheDocument();
    });
    expect(screen.getByText("Follow Up")).toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    const { container } = render(<TemplatesPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state on fetch failure", async () => {
    mockAuthenticatedSession();
    (apiFetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
