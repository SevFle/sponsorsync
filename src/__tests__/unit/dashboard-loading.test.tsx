import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

describe("DashboardLoading", () => {
  it("renders loading skeleton with page header", async () => {
    const { default: DashboardLoading } = await import("@/app/(dashboard)/loading");

    const { container } = render(<DashboardLoading />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Overview of your sponsorship activity.")).toBeInTheDocument();
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders inside a wrapping div with mt-6 spacing", async () => {
    const { default: DashboardLoading } = await import("@/app/(dashboard)/loading");

    const { container } = render(<DashboardLoading />);

    const mt6 = container.querySelector(".mt-6");
    expect(mt6).toBeInTheDocument();
    expect(mt6?.querySelector(".animate-pulse")).toBeTruthy();
  });
});
