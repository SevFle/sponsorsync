import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guard", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { requireAuth } from "@/lib/auth/guard";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard Layout - auth guard", () => {
  it("calls requireAuth for session validation", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const { default: DashboardLayout } = await import(
      "@/app/(dashboard)/layout"
    );

    await DashboardLayout({ children: "test" });

    expect(requireAuth).toHaveBeenCalledTimes(1);
  });

  it("allows rendering when requireAuth succeeds", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

    const { default: DashboardLayout } = await import(
      "@/app/(dashboard)/layout"
    );

    const result = await DashboardLayout({ children: "test" });
    expect(result).toBeDefined();
  });

  it("propagates redirect when requireAuth rejects (unauthenticated)", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("NEXT_REDIRECT")
    );

    const { default: DashboardLayout } = await import(
      "@/app/(dashboard)/layout"
    );

    await expect(
      DashboardLayout({ children: "test" })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("propagates error when requireAuth throws non-redirect error", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Auth service unavailable")
    );

    const { default: DashboardLayout } = await import(
      "@/app/(dashboard)/layout"
    );

    await expect(
      DashboardLayout({ children: "test" })
    ).rejects.toThrow("Auth service unavailable");
  });
});
