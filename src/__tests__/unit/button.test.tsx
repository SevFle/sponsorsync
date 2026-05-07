import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders as a button element", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button", { name: "Test" })).toBeInTheDocument();
  });

  it("applies primary variant classes by default", () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-black");
    expect(btn.className).toContain("text-white");
  });

  it("applies secondary variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-gray-100");
    expect(btn.className).toContain("text-gray-900");
  });

  it("applies danger variant classes", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-red-600");
    expect(btn.className).toContain("text-white");
  });

  it("applies custom className", () => {
    render(<Button className="extra-class">Test</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("extra-class");
  });

  it("passes through additional button props", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies base classes for all variants", () => {
    render(<Button>Base</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("rounded-md");
    expect(btn.className).toContain("px-4");
    expect(btn.className).toContain("py-2");
  });

  it("handles onClick handler", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByRole("button").click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
