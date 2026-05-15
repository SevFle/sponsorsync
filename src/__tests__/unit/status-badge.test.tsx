import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, type DealStatus } from "@/components/ui/status-badge";

const statuses: DealStatus[] = ["active", "draft", "proposed", "completed", "cancelled"];

const expectedLabels: Record<DealStatus, string> = {
  active: "Active",
  draft: "Draft",
  proposed: "Proposed",
  completed: "Completed",
  cancelled: "Cancelled",
};

describe("StatusBadge", () => {
  statuses.forEach((status) => {
    it(`renders "${expectedLabels[status]}" label for status "${status}"`, () => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
    });
  });

  it("applies green classes for active status", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-700");
  });

  it("applies amber classes for draft status", () => {
    const { container } = render(<StatusBadge status="draft" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-amber-100");
    expect(badge.className).toContain("text-amber-700");
  });

  it("applies slate classes for completed status", () => {
    const { container } = render(<StatusBadge status="completed" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-slate-100");
    expect(badge.className).toContain("text-slate-500");
  });

  it("applies blue classes for proposed status", () => {
    const { container } = render(<StatusBadge status="proposed" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-blue-100");
    expect(badge.className).toContain("text-blue-700");
  });

  it("applies gray classes for cancelled status", () => {
    const { container } = render(<StatusBadge status="cancelled" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-gray-100");
    expect(badge.className).toContain("text-gray-400");
  });

  it("applies rounded-full and pill classes", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });

  it("accepts custom className", () => {
    const { container } = render(<StatusBadge status="active" className="my-custom" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("my-custom");
  });
});
