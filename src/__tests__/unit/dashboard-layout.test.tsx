import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
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

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardLayout - auth redirect", () => {
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

  it("redirects session with user object but no id (requireAuth validates user ID)", async () => {
    mockAuth({ user: {} } as any);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(
      DashboardLayout({ children: <div>test</div> })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects when session is explicitly undefined", async () => {
    mockAuth(undefined as any);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(
      DashboardLayout({ children: <div>test</div> })
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("calls getServerSession with authOptions", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await DashboardLayout({ children: <div>test</div> });

    expect(getServerSession).toHaveBeenCalledWith({});
  });

  it("calls getServerSession exactly once per render", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await DashboardLayout({ children: <div>test</div> });

    expect(getServerSession).toHaveBeenCalledTimes(1);
  });
});

describe("DashboardLayout - getServerSession error handling", () => {
  it("throws when getServerSession rejects", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(
      DashboardLayout({ children: <div>test</div> })
    ).rejects.toThrow("Database connection failed");
  });

  it("throws when getServerSession returns a promise that rejects with timeout", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Session lookup timed out")
    );
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(
      DashboardLayout({ children: <div>test</div> })
    ).rejects.toThrow("Session lookup timed out");
  });
});

describe("DashboardLayout - rendering when authenticated", () => {
  it("renders nav with SponsorSync heading and children", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div data-testid="child-content">Hello Dashboard</div>,
    });

    const { container } = render(result as React.ReactElement);
    expect(container.textContent).toContain("SponsorSync");
    expect(screen.getByTestId("child-content").textContent).toBe("Hello Dashboard");
  });

  it("wraps children in AuthProvider (SessionProvider)", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div data-testid="child">content</div>,
    });

    render(result as React.ReactElement);
    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders all navigation links", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div>test</div>,
    });

    const { container } = render(result as React.ReactElement);
    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/dashboard/deals");
    expect(hrefs).toContain("/dashboard/sponsors");
    expect(hrefs).toContain("/dashboard/deliverables");
    expect(hrefs).toContain("/dashboard/payments");
    expect(hrefs).toContain("/dashboard/templates");
    expect(hrefs).toContain("/dashboard/integrations");
    expect(hrefs).toContain("/dashboard/settings");
  });

  it("renders navigation with correct link count", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div>test</div>,
    });

    const { container } = render(result as React.ReactElement);
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(10);
  });

  it("renders children in main element", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div data-testid="main-child">Main Content</div>,
    });

    const { container } = render(result as React.ReactElement);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(screen.getByTestId("main-child")).toBeInTheDocument();
  });

  it("renders nav element with correct structure", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div>test</div>,
    });

    const { container } = render(result as React.ReactElement);
    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav?.querySelector("h2")?.textContent).toBe("SponsorSync");
  });
});

describe("DashboardLayout - session variations", () => {
  it("allows session with name and email", async () => {
    mockAuth({ user: { id: "user-1", email: "admin@test.com", name: "Admin User" } });
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({ children: <div>test</div> });
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("allows session with minimal user data", async () => {
    mockAuth({ user: { id: "u" } } as any);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({ children: <div>test</div> });
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("allows session with extra fields", async () => {
    mockAuth({ user: { id: "user-1", email: "test@test.com", role: "admin" } } as any);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({ children: <div>test</div> });
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

describe("DashboardLayout - layout structure", () => {
  it("uses flex layout with min-h-screen", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div>test</div>,
    });

    const { container } = render(result as React.ReactElement);
    const wrapper = container.querySelector(".flex.min-h-screen");
    expect(wrapper).toBeInTheDocument();
  });

  it("renders sidebar with fixed width", async () => {
    mockAuth(mockSession);
    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const result = await DashboardLayout({
      children: <div>test</div>,
    });

    const { container } = render(result as React.ReactElement);
    const nav = container.querySelector("nav.w-64");
    expect(nav).toBeInTheDocument();
  });
});
