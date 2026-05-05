import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ShipmentsPage } from "../src/components/ShipmentsPage";

const mockGet = vi.fn().mockResolvedValue({ data: [], success: true });
const mockPost = vi.fn().mockResolvedValue({ success: true });
const mockPatch = vi.fn().mockResolvedValue({ success: true });
const mockDelete = vi.fn().mockResolvedValue({ success: true });

vi.mock("../src/lib/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const mockShipments = [
  {
    id: "1",
    trackingId: "SL-100",
    customerName: "Alpha Corp",
    origin: "Shanghai",
    destination: "Los Angeles",
    carrier: "Maersk",
    status: "in_transit",
    estimatedDelivery: "2026-06-01",
  },
  {
    id: "2",
    trackingId: "SL-200",
    customerName: "Beta LLC",
    origin: "Rotterdam",
    destination: "New York",
    carrier: "MSC",
    status: "delivered",
    estimatedDelivery: "2026-04-15",
  },
  {
    id: "3",
    trackingId: "SL-300",
    customerName: "Gamma Inc",
    origin: "Tokyo",
    destination: "London",
    carrier: "CMA CGM",
    status: "exception",
    estimatedDelivery: "2026-07-01",
  },
  {
    id: "4",
    trackingId: "SL-400",
    customerName: "Delta Ltd",
    origin: "Busan",
    destination: "Hamburg",
    carrier: "Evergreen",
    status: "customs_clearance",
    estimatedDelivery: "2026-05-20",
  },
  {
    id: "5",
    trackingId: "SL-500",
    customerName: null,
    origin: null,
    destination: null,
    carrier: null,
    status: "pending",
    estimatedDelivery: null,
  },
];

describe("ShipmentsPage: integration tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: mockShipments, success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays all shipment tracking IDs after data loads", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SL-100")).toBeDefined();
    });
    expect(screen.getByText("SL-200")).toBeDefined();
    expect(screen.getByText("SL-300")).toBeDefined();
    expect(screen.getByText("SL-400")).toBeDefined();
    expect(screen.getByText("SL-500")).toBeDefined();
  });

  it("displays customer names from shipments", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alpha Corp")).toBeDefined();
    });
    expect(screen.getByText("Beta LLC")).toBeDefined();
    expect(screen.getByText("Gamma Inc")).toBeDefined();
  });

  it("displays origin and destination cities", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Shanghai")).toBeDefined();
    });
    expect(screen.getByText("Rotterdam")).toBeDefined();
    expect(screen.getByText("Los Angeles")).toBeDefined();
    expect(screen.getByText("New York")).toBeDefined();
  });

  it("displays carrier names", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Maersk")).toBeDefined();
    });
    expect(screen.getByText("MSC")).toBeDefined();
    expect(screen.getByText("CMA CGM")).toBeDefined();
    expect(screen.getByText("Evergreen")).toBeDefined();
  });

  it("shows loading state before data arrives", () => {
    mockGet.mockReturnValue(new Promise(() => {}));

    render(<ShipmentsPage />);
    expect(screen.getByText("Loading shipments...")).toBeDefined();
  });

  it("shows error message when API fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Server overloaded"));

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Server overloaded")).toBeDefined();
    });
  });

  it("shows error when API returns non-Error rejection", async () => {
    mockGet.mockRejectedValueOnce("string error");

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load shipments")).toBeDefined();
    });
  });

  it("renders status filter tabs with correct labels", () => {
    render(<ShipmentsPage />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getByText("In Transit")).toBeDefined();
    expect(screen.getByText("Delivered")).toBeDefined();
    expect(screen.getByText("Delayed")).toBeDefined();
    expect(screen.getByText("Customs")).toBeDefined();
  });

  it("renders search input with correct placeholder", () => {
    render(<ShipmentsPage />);
    expect(
      screen.getByPlaceholderText("Search by tracking ID, customer, origin, destination...")
    ).toBeDefined();
  });

  it("passes status filter to API when tab clicked", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    mockGet.mockResolvedValueOnce({ data: mockShipments.filter(s => s.status === "delivered"), success: true });
    fireEvent.click(screen.getByText("Delayed"));

    await waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("status=exception");
    });
  });

  it("passes search query to API when typing", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    mockGet.mockResolvedValueOnce({ data: [], success: true });
    const input = screen.getByPlaceholderText(/tracking ID/);
    fireEvent.change(input, { target: { value: "SL-100" } });

    await waitFor(() => {
      const calls = mockGet.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain("search=SL-100");
    });
  });

  it("shows empty state when API returns empty data array", async () => {
    mockGet.mockResolvedValueOnce({ data: [], success: true });

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No shipments found.")).toBeDefined();
    });
  });

  it("shows empty state when API returns null data", async () => {
    mockGet.mockResolvedValueOnce({ data: null, success: true });

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("No shipments found.")).toBeDefined();
    });
  });

  it("renders status badges for each shipment", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SL-100")).toBeDefined();
    });
    expect(screen.getByText("Exception")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
    expect(screen.getAllByText("In Transit").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Delivered").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Customs").length).toBeGreaterThanOrEqual(1);
  });

  it("renders tracking IDs as clickable links", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SL-100")).toBeDefined();
    });
    const link = screen.getByText("SL-100").closest("a");
    expect(link?.getAttribute("href")).toBe("/shipments/SL-100");
  });

  it("renders headings for table columns", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("SL-100")).toBeDefined();
    });
    expect(screen.getByText("Tracking ID")).toBeDefined();
    expect(screen.getByText("Customer")).toBeDefined();
    expect(screen.getByText("Origin")).toBeDefined();
    expect(screen.getByText("Destination")).toBeDefined();
    expect(screen.getByText("Carrier")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
    expect(screen.getByText("ETA")).toBeDefined();
  });

  it("recovers from error when new data loads successfully", async () => {
    mockGet
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ data: mockShipments, success: true });

    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Temporary failure")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Delayed"));

    await waitFor(() => {
      expect(screen.getByText("SL-300")).toBeDefined();
    });
    expect(screen.queryByText("Temporary failure")).toBeNull();
  });

  it("API is called with correct base path", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/api/shipments");
    });
  });

  it("sends both status and search params when both are set", async () => {
    render(<ShipmentsPage />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    mockGet.mockResolvedValueOnce({ data: [], success: true });
    fireEvent.change(screen.getByPlaceholderText(/tracking ID/), { target: { value: "SL" } });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    mockGet.mockResolvedValueOnce({ data: [], success: true });
    fireEvent.click(screen.getByText("In Transit"));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(3);
    });

    const lastCall = mockGet.mock.calls[2];
    expect(lastCall[0]).toContain("status=in_transit");
    expect(lastCall[0]).toContain("search=SL");
  });
});
