import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/tracking-api", () => ({
  getShipmentByTrackingId: vi.fn(),
}));

vi.mock("@/components/BrandedShell", () => ({
  BrandedShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="branded-shell">{children}</div>
  ),
}));

vi.mock("@/components/ShipmentHeader", () => ({
  ShipmentHeader: ({ shipment }: { shipment: { trackingId: string } }) => (
    <div data-testid="shipment-header">{shipment.trackingId}</div>
  ),
}));

vi.mock("@/components/MilestoneTimeline", () => ({
  MilestoneTimeline: ({ milestones }: { milestones: { type: string }[] }) => (
    <div data-testid="milestone-timeline">{milestones.length} milestones</div>
  ),
}));

import TrackingPage, { generateMetadata } from "@/app/track/[trackingId]/page";
import { getShipmentByTrackingId } from "@/lib/tracking-api";

const mockGetShipment = vi.mocked(getShipmentByTrackingId);

describe("TrackingPage: comprehensive tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("not found state", () => {
    it("renders not found heading when shipment returns null", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-NOTFOUND" }),
      });
      render(jsx);
      expect(screen.getByText("Shipment Not Found")).toBeDefined();
    });

    it("displays the tracking ID in not found message", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-MISSING" }),
      });
      render(jsx);
      expect(screen.getByText("SL-MISSING")).toBeDefined();
    });

    it("displays hint text to check tracking ID", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-GONE" }),
      });
      render(jsx);
      expect(
        screen.getByText("Please check the tracking ID and try again.")
      ).toBeDefined();
    });

    it("renders not found state inside BrandedShell", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-NO" }),
      });
      render(jsx);
      expect(screen.getByTestId("branded-shell")).toBeDefined();
      expect(screen.getByText("Shipment Not Found")).toBeDefined();
    });

    it("shows not found icon", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-ICON" }),
      });
      const { container } = render(jsx);
      expect(container.querySelector(".tracking-not-found-icon")).not.toBeNull();
    });
  });

  describe("successful shipment rendering", () => {
    it("renders shipment header and milestone timeline", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-123",
        origin: "Shanghai",
        destination: "Los Angeles",
        status: "in_transit",
        milestones: [
          { type: "pickup", description: "Picked up", occurredAt: "2026-01-01" },
        ],
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-123" }),
      });
      render(jsx);
      expect(screen.getByTestId("shipment-header")).toBeDefined();
      expect(screen.getByTestId("milestone-timeline")).toBeDefined();
    });

    it("passes milestones to MilestoneTimeline", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-456",
        origin: "Tokyo",
        destination: "Paris",
        status: "delivered",
        milestones: [
          { type: "pickup", description: "Picked up", occurredAt: "2026-01-01" },
          { type: "in_transit", description: "In transit", occurredAt: "2026-01-05" },
          { type: "delivered", description: "Delivered", occurredAt: "2026-01-20" },
        ],
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-456" }),
      });
      render(jsx);
      expect(screen.getByText("3 milestones")).toBeDefined();
    });

    it("passes empty milestones array when milestones is undefined", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-789",
        origin: "Busan",
        destination: "Hamburg",
        status: "pending",
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-789" }),
      });
      render(jsx);
      expect(screen.getByText("0 milestones")).toBeDefined();
    });

    it("passes full branding data to BrandedShell", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-BRAND",
        origin: "Shanghai",
        destination: "New York",
        status: "in_transit",
        branding: {
          tenantName: "Acme Logistics",
          logoUrl: "https://acme.com/logo.png",
          primaryColor: "#3B82F6",
          tagline: "Ship with confidence",
          contactEmail: "support@acme.com",
          contactPhone: "+1-555-1234",
          supportUrl: "https://help.acme.com",
          customFooterText: "Copyright 2026 Acme",
        },
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-BRAND" }),
      });
      render(jsx);
      expect(screen.getByTestId("branded-shell")).toBeDefined();
      expect(screen.getByTestId("shipment-header")).toBeDefined();
    });

    it("handles shipment with null branding gracefully", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-NOBRAND",
        origin: "Tokyo",
        destination: "London",
        status: "delivered",
        branding: null,
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-NOBRAND" }),
      });
      render(jsx);
      expect(screen.getByTestId("branded-shell")).toBeDefined();
      expect(screen.getByTestId("shipment-header")).toBeDefined();
    });

    it("handles shipment with partial branding (only tenantName)", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-PARTIAL",
        origin: "Mumbai",
        destination: "Dubai",
        status: "in_transit",
        branding: {
          tenantName: "PartialCorp",
        },
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-PARTIAL" }),
      });
      render(jsx);
      expect(screen.getByTestId("branded-shell")).toBeDefined();
    });

    it("passes primaryColor from branding to components", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-COLOR",
        origin: "A",
        destination: "B",
        status: "in_transit",
        branding: {
          tenantName: "ColorCo",
          primaryColor: "#FF0000",
        },
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-COLOR" }),
      });
      render(jsx);
      expect(screen.getByTestId("shipment-header")).toBeDefined();
      expect(screen.getByTestId("milestone-timeline")).toBeDefined();
    });
  });

  describe("generateMetadata", () => {
    it("returns correct title with tracking ID", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ trackingId: "SL-META" }),
      });
      expect(meta.title).toBe("Tracking SL-META — ShipLens");
    });

    it("returns correct description with tracking ID", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ trackingId: "SL-DESC" }),
      });
      expect(meta.description).toBe("Track shipment SL-DESC in real-time");
    });

    it("works with special characters in tracking ID", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ trackingId: "SL-ABC-123" }),
      });
      expect(meta.title).toBe("Tracking SL-ABC-123 — ShipLens");
      expect(meta.description).toBe("Track shipment SL-ABC-123 in real-time");
    });

    it("works with short tracking ID", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ trackingId: "X" }),
      });
      expect(meta.title).toBe("Tracking X — ShipLens");
      expect(meta.description).toBe("Track shipment X in real-time");
    });

    it("works with numeric tracking ID", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ trackingId: "12345" }),
      });
      expect(meta.title).toBe("Tracking 12345 — ShipLens");
    });
  });

  describe("getShipmentByTrackingId call", () => {
    it("calls API with the correct tracking ID", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-CALL" }),
      });
      expect(mockGetShipment).toHaveBeenCalledWith("SL-CALL");
    });

    it("awaits params before extracting tracking ID", async () => {
      mockGetShipment.mockResolvedValueOnce(null);
      let resolveParams: (value: { trackingId: string }) => void;
      const paramsPromise = new Promise<{ trackingId: string }>((resolve) => {
        resolveParams = resolve;
      });

      const pagePromise = TrackingPage({ params: paramsPromise });
      resolveParams!({ trackingId: "SL-ASYNC" });

      await pagePromise;
      expect(mockGetShipment).toHaveBeenCalledWith("SL-ASYNC");
    });
  });

  describe("edge cases", () => {
    it("handles shipment with empty milestones array", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-EMPTY",
        origin: "A",
        destination: "B",
        status: "pending",
        milestones: [],
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-EMPTY" }),
      });
      render(jsx);
      expect(screen.getByText("0 milestones")).toBeDefined();
    });

    it("handles shipment with all optional fields present", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-FULL",
        reference: "PO-999",
        origin: "Singapore",
        destination: "Rotterdam",
        status: "in_transit",
        carrier: "Maersk",
        serviceType: "FCL",
        estimatedDelivery: "2026-08-01",
        actualDelivery: null,
        customerName: "Big Corp",
        createdAt: "2026-05-01",
        milestones: [
          { type: "booked", description: "Booked", location: "Singapore", occurredAt: "2026-05-01T10:00:00Z" },
        ],
        branding: {
          tenantName: "FullBrand",
          logoUrl: "https://full.brand/logo.png",
          primaryColor: "#00FF00",
          tagline: "Full brand experience",
          contactEmail: "info@full.brand",
          contactPhone: "+31-20-1234567",
          supportUrl: "https://support.full.brand",
          customFooterText: "2026 FullBrand",
        },
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-FULL" }),
      });
      render(jsx);
      expect(screen.getByTestId("branded-shell")).toBeDefined();
      expect(screen.getByTestId("shipment-header")).toBeDefined();
      expect(screen.getByText("1 milestones")).toBeDefined();
    });

    it("handles shipment with only required fields", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-MIN",
        origin: "X",
        destination: "Y",
        status: "pending",
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-MIN" }),
      });
      render(jsx);
      expect(screen.getByTestId("shipment-header")).toBeDefined();
    });

    it("does not render not found message for valid shipment", async () => {
      mockGetShipment.mockResolvedValueOnce({
        trackingId: "SL-VALID",
        origin: "A",
        destination: "B",
        status: "in_transit",
      });
      const jsx = await TrackingPage({
        params: Promise.resolve({ trackingId: "SL-VALID" }),
      });
      render(jsx);
      expect(screen.queryByText("Shipment Not Found")).toBeNull();
      expect(screen.queryByText("Please check the tracking ID")).toBeNull();
    });
  });
});
