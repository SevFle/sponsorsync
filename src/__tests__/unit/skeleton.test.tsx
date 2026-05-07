import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, DealCardSkeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  it("renders with animate-pulse class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
  });

  it("renders with bg-gray-200 class", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-gray-200");
  });

  it("accepts custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-28" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-28");
  });

  it("has aria-hidden attribute", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("DealCardSkeleton", () => {
  it("renders without crashing", () => {
    render(<DealCardSkeleton />);
  });

  it("contains multiple skeleton elements", () => {
    const { container } = render(<DealCardSkeleton />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("matches the card layout structure", () => {
    const { container } = render(<DealCardSkeleton />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("rounded-lg");
    expect(card.className).toContain("border");
  });
});
