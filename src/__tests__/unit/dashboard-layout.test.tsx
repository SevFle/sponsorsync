import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardLayout", () => {
  it("redirects to /login when not authenticated", async () => {
    mockAuth(null);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(
      DashboardLayout({ children: <div>test</div> })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("does not redirect when authenticated", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({ children: <div data-testid="child">test</div> });
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("renders nav with SponsorSync heading and children when authenticated", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div data-testid="child-content">Hello Dashboard</div>,
    });

    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toContain("SponsorSync");
    expect(screen.getByTestId("child-content").textContent).toBe("Hello Dashboard");
  });
});
