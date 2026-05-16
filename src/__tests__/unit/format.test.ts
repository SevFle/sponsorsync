import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats zero dollars", () => {
    expect(formatCurrency(0, "USD")).toBe("$0");
  });

  it("formats positive whole dollars", () => {
    expect(formatCurrency(4000, "USD")).toBe("$4,000");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1000000, "USD")).toBe("$1,000,000");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-500, "USD")).toBe("-$500");
  });

  it("formats single digit amounts", () => {
    expect(formatCurrency(5, "USD")).toBe("$5");
  });

  it("formats hundred amounts", () => {
    expect(formatCurrency(100, "USD")).toBe("$100");
  });

  it("formats with EUR currency", () => {
    expect(formatCurrency(1000, "EUR")).toBe("€1,000");
  });

  it("formats with GBP currency", () => {
    expect(formatCurrency(2500, "GBP")).toBe("£2,500");
  });

  it("formats EUR with exact symbol placement", () => {
    expect(formatCurrency(0, "EUR")).toBe("€0");
    expect(formatCurrency(-500, "EUR")).toBe("-€500");
    expect(formatCurrency(1000000, "EUR")).toBe("€1,000,000");
  });

  it("formats GBP with exact symbol placement", () => {
    expect(formatCurrency(0, "GBP")).toBe("£0");
    expect(formatCurrency(100, "GBP")).toBe("£100");
    expect(formatCurrency(-300, "GBP")).toBe("-£300");
  });

  it("EUR result matches currency symbol pattern", () => {
    const result = formatCurrency(1000, "EUR");
    expect(result).toMatch(/^€[\d,]+$/);
  });

  it("GBP result matches currency symbol pattern", () => {
    const result = formatCurrency(2500, "GBP");
    expect(result).toMatch(/^£[\d,]+$/);
  });

  it("uses zero fraction digits", () => {
    expect(formatCurrency(1500, "USD")).not.toContain(".");
  });

  it("formats 999 correctly", () => {
    expect(formatCurrency(999, "USD")).toBe("$999");
  });

  it("formats 1000 correctly", () => {
    expect(formatCurrency(1000, "USD")).toBe("$1,000");
  });

  it("formats 10000 correctly", () => {
    expect(formatCurrency(10000, "USD")).toBe("$10,000");
  });

  it("formats 100000 correctly", () => {
    expect(formatCurrency(100000, "USD")).toBe("$100,000");
  });
});
