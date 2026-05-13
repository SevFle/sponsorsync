import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardError", () => {
  it("renders error message from error prop", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/error");

    render(<DashboardError error={new Error("Network error")} reset={vi.fn()} />);

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders page header with dashboard title", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/error");

    render(<DashboardError error={new Error("Test error")} reset={vi.fn()} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Overview of your sponsorship activity.")).toBeInTheDocument();
  });

  it("shows generic message when error has no message", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/error");

    const error = new Error();
    error.message = "";
    render(<DashboardError error={error} reset={vi.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls reset when Try again is clicked", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/error");

    const reset = vi.fn();
    render(<DashboardError error={new Error("Test error")} reset={reset} />);

    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders error with digest property", async () => {
    const { default: DashboardError } = await import("@/app/(dashboard)/error");

    const error = new Error("Server error") as Error & { digest?: string };
    error.digest = "abc123";
    render(<DashboardError error={error} reset={vi.fn()} />);

    expect(screen.getByText("Server error")).toBeInTheDocument();
  });
});
