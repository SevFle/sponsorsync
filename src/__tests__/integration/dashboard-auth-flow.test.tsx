import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/auth/guard", () => ({
  getAuthenticatedSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn(),
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn(),
}));

import { getAuthenticatedSession } from "@/lib/auth/guard";
import { redirect } from "next/navigation";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDeliverablesByUserId } from "@/lib/db/queries/deliverables";
import { getPaymentsByUserId } from "@/lib/db/queries/payments";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function setAuth(session: typeof mockSession | null) {
  (getAuthenticatedSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function mockDbQueries(deals: any[] = [], deliverables: any[] = [], payments: any[] = []) {
  (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deals);
  (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(deliverables);
  (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(payments);
}

const emptyDashboard = {
  deals: [],
  deliverables: [],
  payments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Dashboard auth flow - server-side redirect", () => {
  it("redirects to /login when not authenticated", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("does not query database when unauthenticated", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(getDealsByUserId).not.toHaveBeenCalled();
    expect(getDeliverablesByUserId).not.toHaveBeenCalled();
    expect(getPaymentsByUserId).not.toHaveBeenCalled();
  });

  it("does not redirect when authenticated", async () => {
    setAuth(mockSession);
    mockDbQueries();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

describe("Dashboard auth flow - server-side data fetching", () => {
  it("fetches all data sources for authenticated user", async () => {
    setAuth(mockSession);
    mockDbQueries();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();

    expect(getDealsByUserId).toHaveBeenCalledWith("user-1");
    expect(getDeliverablesByUserId).toHaveBeenCalledWith("user-1");
    expect(getPaymentsByUserId).toHaveBeenCalledWith("user-1");
  });

  it("renders dashboard content after successful data fetch", async () => {
    setAuth(mockSession);
    mockDbQueries();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });

  it("renders dashboard with deal data", async () => {
    setAuth(mockSession);
    mockDbQueries(
      [{ id: "d1", status: "active", sponsorName: "Test" }],
      [],
      []
    );
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    render(result as React.ReactElement);

    await waitFor(() => {
      expect(screen.getByText("Active Deals")).toBeInTheDocument();
    });
  });
});

describe("Dashboard auth flow - error propagation", () => {
  it("propagates database errors to error boundary", async () => {
    setAuth(mockSession);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );
    mockDbQueries();
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Database connection failed")
    );
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Database connection failed");
  });

  it("propagates network-like errors from deliverables query", async () => {
    setAuth(mockSession);
    (getDealsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (getDeliverablesByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Query timeout")
    );
    (getPaymentsByUserId as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("Query timeout");
  });
});

describe("Dashboard auth flow - session validation", () => {
  it("redirects when getAuthenticatedSession returns null for falsy user id", async () => {
    setAuth(null);
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await expect(DashboardPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(getDealsByUserId).not.toHaveBeenCalled();
  });

  it("queries database with valid session user id", async () => {
    setAuth({ user: { id: "valid-id", email: "test@test.com", name: "Valid User" } });
    mockDbQueries();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    await DashboardPage();
    expect(getDealsByUserId).toHaveBeenCalledWith("valid-id");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("handles session with only user id", async () => {
    setAuth({ user: { id: "u" } } as any);
    mockDbQueries();
    const { default: DashboardPage } = await import("@/app/(dashboard)/page");

    const result = await DashboardPage();
    expect(result).toBeDefined();
    expect(getDealsByUserId).toHaveBeenCalledWith("u");
  });
});
