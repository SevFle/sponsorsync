import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge, type PaymentStatus } from "@/components/ui/payment-status-badge";

const statuses: PaymentStatus[] = ["pending", "paid", "overdue", "cancelled"];

const expectedLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const expectedClasses: Record<PaymentStatus, { bg: string; text: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700" },
  paid: { bg: "bg-green-100", text: "text-green-700" },
  overdue: { bg: "bg-red-100", text: "text-red-700" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-400" },
};

describe("PaymentStatusBadge", () => {
  statuses.forEach((status) => {
    it(`renders "${expectedLabels[status]}" label for status "${status}"`, () => {
      render(<PaymentStatusBadge status={status} />);
      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
    });
  });

  statuses.forEach((status) => {
    it(`applies correct color classes for "${status}" status`, () => {
      const { container } = render(<PaymentStatusBadge status={status} />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain(expectedClasses[status].bg);
      expect(badge.className).toContain(expectedClasses[status].text);
    });
  });

  it("applies rounded-full and pill classes", () => {
    const { container } = render(<PaymentStatusBadge status="paid" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });

  it("accepts custom className", () => {
    const { container } = render(<PaymentStatusBadge status="paid" className="my-custom" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("my-custom");
  });
});
