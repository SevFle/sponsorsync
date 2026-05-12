import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricCard } from "@/components/dashboard/metric-card";

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Active Deals" value={5} accentColor="bg-blue-500" />);
    expect(screen.getByText("Active Deals")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders string values", () => {
    render(<MetricCard label="Revenue" value="$4,000" accentColor="bg-green-500" />);
    expect(screen.getByText("$4,000")).toBeInTheDocument();
  });

  it("renders zero values", () => {
    render(<MetricCard label="Test" value={0} accentColor="bg-red-500" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("applies accent color class", () => {
    const { container } = render(<MetricCard label="Test" value={1} accentColor="bg-green-500" />);
    const accentBar = container.querySelector(".bg-green-500");
    expect(accentBar).toBeInTheDocument();
  });
});
