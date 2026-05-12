import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SponsorCard, type SponsorCardSponsor } from "@/components/ui/sponsor-card";

const baseSponsor: SponsorCardSponsor = {
  id: "1",
  name: "Acme Corp",
  company: "Acme Inc",
  email: "contact@acme.com",
  phone: "+1234567890",
  activeDealCount: 3,
  totalDealCount: 5,
  createdAt: "2024-01-15T00:00:00.000Z",
};

describe("SponsorCard", () => {
  it("renders sponsor name", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders company when present", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("Acme Inc")).toBeInTheDocument();
  });

  it("does not render company element when null", () => {
    const sponsor = { ...baseSponsor, company: null };
    render(<SponsorCard sponsor={sponsor} />);
    expect(screen.queryByText("Acme Inc")).not.toBeInTheDocument();
  });

  it("renders email when present", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("contact@acme.com")).toBeInTheDocument();
  });

  it("renders phone when present", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("+1234567890")).toBeInTheDocument();
  });

  it("renders active deal count badge", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("3 active")).toBeInTheDocument();
  });

  it("renders total deal count", () => {
    render(<SponsorCard sponsor={baseSponsor} />);
    expect(screen.getByText("5 total")).toBeInTheDocument();
  });

  it("does not render total when zero", () => {
    const sponsor = { ...baseSponsor, totalDealCount: 0 };
    render(<SponsorCard sponsor={sponsor} />);
    expect(screen.queryByText("0 total")).not.toBeInTheDocument();
  });

  it("applies green badge when active deals > 0", () => {
    const { container } = render(<SponsorCard sponsor={baseSponsor} />);
    const badge = screen.getByText("3 active");
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-700");
  });

  it("applies gray badge when active deals = 0", () => {
    const sponsor = { ...baseSponsor, activeDealCount: 0 };
    render(<SponsorCard sponsor={sponsor} />);
    const badge = screen.getByText("0 active");
    expect(badge.className).toContain("bg-gray-100");
    expect(badge.className).toContain("text-gray-500");
  });

  it("does not render contact section when no email or phone", () => {
    const sponsor = { ...baseSponsor, email: null, phone: null };
    render(<SponsorCard sponsor={sponsor} />);
    expect(screen.queryByText("contact@acme.com")).not.toBeInTheDocument();
    expect(screen.queryByText("+1234567890")).not.toBeInTheDocument();
  });
});
