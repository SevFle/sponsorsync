import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DealCard, type DealCardDeal } from "@/components/ui/deal-card";

const baseDeal: DealCardDeal = {
  id: "deal-1",
  sponsorName: "Acme Corp",
  title: "Q2 Podcast Package",
  description: "Sponsorship for Q2",
  status: "active",
  totalValue: 12000,
  currency: "USD",
  endDate: "2099-12-31",
  progress: 70,
};

describe("DealCard", () => {
  it("renders sponsor name", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders title", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("Q2 Podcast Package")).toBeInTheDocument();
  });

  it("renders formatted currency amount", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("$12,000")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders progress bar with correct aria values", () => {
    render(<DealCard deal={baseDeal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "70");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveStyle({ width: "70%" });
  });

  it("does not render amount when totalValue is null", () => {
    const deal = { ...baseDeal, totalValue: null };
    render(<DealCard deal={deal} />);
    expect(screen.queryByText("$12,000")).not.toBeInTheDocument();
  });

  it("does not render deadline when endDate is null", () => {
    const deal = { ...baseDeal, endDate: null };
    const { container } = render(<DealCard deal={deal} />);
    const bottomRow = container.querySelector(".mt-3");
    const deadlineSpan = bottomRow?.querySelector("span");
    expect(deadlineSpan).toBeNull();
  });

  it("shows overdue indicator for past end dates", () => {
    const deal = { ...baseDeal, endDate: "2020-01-01" };
    render(<DealCard deal={deal} />);
    expect(screen.getByText(/Overdue by/i)).toBeInTheDocument();
  });

  it("shows 'Due in' indicator for dates within 7 days", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const deal = { ...baseDeal, endDate: futureDate.toISOString().split("T")[0] };
    render(<DealCard deal={deal} />);
    expect(screen.getByText(/Due in \d+d/)).toBeInTheDocument();
  });

  it("shows normal due date for far future dates", () => {
    render(<DealCard deal={baseDeal} />);
    expect(screen.getByText(/Due/i)).toBeInTheDocument();
  });

  it("applies green progress bar for active status", () => {
    render(<DealCard deal={baseDeal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-green-500");
  });

  it("applies amber progress bar for draft status", () => {
    const deal = { ...baseDeal, status: "draft" as const };
    render(<DealCard deal={deal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-amber-500");
  });

  it("clamps progress to 0-100 range", () => {
    const deal = { ...baseDeal, progress: 150 };
    render(<DealCard deal={deal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("clamps negative progress to 0%", () => {
    const deal = { ...baseDeal, progress: -10 };
    render(<DealCard deal={deal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("formats different currencies", () => {
    const deal = { ...baseDeal, totalValue: 5000, currency: "EUR" };
    render(<DealCard deal={deal} />);
    expect(screen.getByText("€5,000")).toBeInTheDocument();
  });
});
