import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState", () => {
  it("renders the message", () => {
    render(<EmptyState message="No deals yet" />);
    expect(screen.getByText("No deals yet")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState message="No deals yet" description="Create your first deal." />
    );
    expect(screen.getByText("Create your first deal.")).toBeInTheDocument();
  });

  it("does not render description element when not provided", () => {
    const { container } = render(<EmptyState message="No items" />);
    const descriptions = container.querySelectorAll("p");
    expect(descriptions).toHaveLength(1);
  });

  it("renders the inbox icon", () => {
    const { container } = render(<EmptyState message="Empty" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies border-dashed and center alignment", () => {
    const { container } = render(<EmptyState message="Empty" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("border-dashed");
    expect(wrapper.className).toContain("text-center");
  });
});
