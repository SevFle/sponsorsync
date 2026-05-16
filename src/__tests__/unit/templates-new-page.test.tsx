import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import NewTemplatePage from "@/app/(dashboard)/templates/new/page";

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

vi.mock("@/components/templates/TemplateEditor", () => ({
  TemplateEditor: ({ onSave }: { onSave: (data: { name: string; subject: string; body: string; category: string }) => void }) => (
    <button onClick={() => onSave({ name: "Test", subject: "Sub", body: "Body", category: "general" })}>
      Save Template
    </button>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
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

describe("NewTemplatePage - auth guard via useAuth", () => {
  it("redirects to login with callbackUrl when unauthenticated", async () => {
    mockUnauthenticatedSession();

    render(<NewTemplatePage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.stringContaining("/login?callbackUrl=")
      );
    });
  });

  it("does not redirect when authenticated", async () => {
    mockAuthenticatedSession();

    render(<NewTemplatePage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when session is loading", async () => {
    mockLoadingSession();

    render(<NewTemplatePage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("renders page content when authenticated", async () => {
    mockAuthenticatedSession();

    render(<NewTemplatePage />);

    expect(screen.getByText("New Template")).toBeInTheDocument();
    expect(screen.getByText("Save Template")).toBeInTheDocument();
  });

  it("shows spinner when session is loading", async () => {
    mockLoadingSession();

    const { container } = render(<NewTemplatePage />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows spinner when unauthenticated (before redirect)", async () => {
    mockUnauthenticatedSession();

    const { container } = render(<NewTemplatePage />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});
