import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  results: [] as any[],
  index: 0,
  shouldThrow: false,
}));

vi.mock("@shiplens/db", () => {
  function createChain(): any {
    const chain: any = {};
    const noop = () => chain;
    chain.from = noop;
    chain.where = noop;
    chain.orderBy = noop;
    chain.limit = noop;
    chain.offset = noop;
    chain.then = (resolve: any, reject: any) => {
      if (mockState.shouldThrow) {
        reject(new Error("Database connection failed"));
        return;
      }
      resolve(mockState.results[mockState.index++]);
    };
    return chain;
  }

  return {
    db: { select: () => createChain() },
    shipments: {
      id: "id",
      tenantId: "tenantId",
      trackingId: "trackingId",
      reference: "reference",
      origin: "origin",
      destination: "destination",
      carrier: "carrier",
      serviceType: "serviceType",
      status: "status",
      customerName: "customerName",
      customerEmail: "customerEmail",
      estimatedDelivery: "estimatedDelivery",
      actualDelivery: "actualDelivery",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    milestones: {
      id: "id",
      shipmentId: "shipmentId",
      type: "type",
      description: "description",
      location: "location",
      occurredAt: "occurredAt",
      createdAt: "createdAt",
    },
    shipmentStatusEnum: {
      enumValues: [
        "pending",
        "booked",
        "in_transit",
        "at_port",
        "customs_clearance",
        "out_for_delivery",
        "delivered",
        "exception",
      ],
    },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (c: any, v: any) => ({ col: c, val: v }),
  and: (...c: any[]) => c.filter(Boolean),
  or: (...c: any[]) => c,
  like: (c: any, v: any) => ({ col: c, val: v }),
  inArray: (c: any, v: any) => ({ col: c, vals: v }),
  gte: (c: any, v: any) => ({ col: c, val: v }),
  lte: (c: any, v: any) => ({ col: c, val: v }),
  desc: (c: any) => ({ dir: "desc", col: c }),
  asc: (c: any) => ({ dir: "asc", col: c }),
  sql: (strings: any) => strings,
}));

import { buildServer } from "../../src/server";
import {
  authBearerHeader,
  apiKeyHeader,
  DEFAULT_SECRET,
  createCsrfToken,
} from "../helpers/auth";
import { hashApiKey } from "../../src/plugins/auth";

const mockResolver = async (keyHash: string) => {
  if (keyHash === hashApiKey("valid-key")) return "tenant-ship";
  return null;
};

function createMockShipment(overrides: Record<string, any> = {}) {
  return {
    id: "s-001",
    trackingId: "SL-TEST001",
    reference: "REF-001",
    origin: "Shanghai",
    destination: "Los Angeles",
    carrier: "Maersk",
    serviceType: "FCL",
    status: "in_transit",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    estimatedDelivery: new Date("2024-06-01T00:00:00.000Z"),
    actualDelivery: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-15T00:00:00.000Z"),
    ...overrides,
  };
}

function createMockMilestone(overrides: Record<string, any> = {}) {
  return {
    shipmentId: "s-001",
    type: "in_transit",
    description: "Container loaded on vessel",
    location: "Shanghai Port",
    occurredAt: new Date("2024-01-10T00:00:00.000Z"),
    ...overrides,
  };
}

function setupListResults(opts: {
  count?: number;
  shipments?: any[];
  milestones?: any[];
}) {
  const count = opts.count ?? opts.shipments?.length ?? 0;
  mockState.results = [
    [{ count: String(count) }],
    opts.shipments ?? [],
    opts.milestones ?? [],
  ];
  mockState.index = 0;
  mockState.shouldThrow = false;
}

describe("Shipment Routes", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    process.env.JWT_SECRET = DEFAULT_SECRET;
    mockState.results = [];
    mockState.index = 0;
    mockState.shouldThrow = false;
    server = await buildServer({ apiKeyResolver: mockResolver });
  });

  afterEach(async () => {
    await server.close();
  });

  describe("GET /api/shipments", () => {
    describe("Authentication", () => {
      it("returns 401 without authentication", async () => {
        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
        });
        expect(res.statusCode).toBe(401);
        expect(res.json().success).toBe(false);
      });

      it("returns 401 with invalid API key", async () => {
        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: apiKeyHeader("invalid-key"),
        });
        expect(res.statusCode).toBe(401);
      });

      it("accepts Bearer token auth", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });
        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });

      it("accepts API key auth", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });
        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: apiKeyHeader("valid-key"),
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });
    });

    describe("Basic listing", () => {
      it("returns shipments with default pagination", async () => {
        const shipment = createMockShipment();
        setupListResults({
          count: 1,
          shipments: [shipment],
          milestones: [],
        });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.total).toBe(1);
        expect(body.page).toBe(1);
        expect(body.pageSize).toBe(25);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe("s-001");
        expect(body.data[0].trackingId).toBe("SL-TEST001");
        expect(body.data[0].reference).toBe("REF-001");
        expect(body.data[0].origin).toBe("Shanghai");
        expect(body.data[0].destination).toBe("Los Angeles");
        expect(body.data[0].carrier).toBe("Maersk");
        expect(body.data[0].serviceType).toBe("FCL");
        expect(body.data[0].status).toBe("in_transit");
        expect(body.data[0].customerName).toBe("John Doe");
        expect(body.data[0].customerEmail).toBe("john@example.com");
        expect(body.data[0].estimatedDelivery).toBe("2024-06-01T00:00:00.000Z");
        expect(body.data[0].actualDelivery).toBeNull();
        expect(body.data[0].lastMilestone).toBeNull();
        expect(body.data[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
        expect(body.data[0].updatedAt).toBe("2024-01-15T00:00:00.000Z");
      });

      it("returns empty list when no shipments exist", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual([]);
        expect(body.total).toBe(0);
        expect(body.page).toBe(1);
        expect(body.pageSize).toBe(25);
      });

      it("serializes dates correctly", async () => {
        const shipment = createMockShipment({
          estimatedDelivery: new Date("2024-12-25T10:30:00.000Z"),
          actualDelivery: new Date("2024-12-24T08:15:00.000Z"),
        });
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        const body = res.json();
        expect(body.data[0].estimatedDelivery).toBe("2024-12-25T10:30:00.000Z");
        expect(body.data[0].actualDelivery).toBe("2024-12-24T08:15:00.000Z");
      });
    });

    describe("Pagination", () => {
      it("respects page parameter", async () => {
        const shipments = Array.from({ length: 5 }, (_, i) =>
          createMockShipment({ id: `s-${i + 10}`, trackingId: `SL-${i + 10}` })
        );
        setupListResults({ count: 50, shipments, milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?page=3",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.page).toBe(3);
        expect(body.total).toBe(50);
      });

      it("respects custom pageSize parameter", async () => {
        setupListResults({ count: 100, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?pageSize=10",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().pageSize).toBe(10);
      });

      it("caps pageSize at MAX_PAGE_SIZE (100)", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?pageSize=500",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().pageSize).toBe(100);
      });

      it("defaults page to 1 when page is 0", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?page=0",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().page).toBe(1);
      });

      it("defaults page to 1 when page is negative", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?page=-5",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().page).toBe(1);
      });

      it("defaults page to 1 when page is non-numeric", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?page=abc",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().page).toBe(1);
      });

      it("defaults pageSize to 25 when pageSize is non-numeric", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?pageSize=abc",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().pageSize).toBe(25);
      });

      it("defaults pageSize to 25 when pageSize is 0", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?pageSize=0",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().pageSize).toBe(25);
      });

      it("clamps negative pageSize to 1", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?pageSize=-10",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().pageSize).toBe(1);
      });
    });

    describe("Status filtering", () => {
      it("filters by single valid status", async () => {
        const shipment = createMockShipment({ status: "delivered" });
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?status=delivered",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
        expect(res.json().data[0].status).toBe("delivered");
      });

      it("filters by multiple valid statuses", async () => {
        const shipments = [
          createMockShipment({ id: "s1", status: "pending" }),
          createMockShipment({ id: "s2", status: "in_transit" }),
        ];
        setupListResults({ count: 2, shipments, milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?status=pending,in_transit",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().total).toBe(2);
      });

      it("ignores invalid status values", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?status=invalid_status",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });

      it("mixes valid and invalid status values", async () => {
        const shipment = createMockShipment({ status: "pending" });
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?status=pending,not_real,also_fake",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
      });
    });

    describe("Search filtering", () => {
      it("filters by search term", async () => {
        const shipment = createMockShipment({ trackingId: "SL-SEARCH1" });
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?search=SL-SEARCH",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
      });

      it("trims search term", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?search=%20%20test%20%20",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });

      it("ignores whitespace-only search term", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?search=%20%20%20",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });

      it("handles empty search string", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?search=",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });
    });

    describe("Date range filtering", () => {
      it("filters with dateFrom", async () => {
        const shipment = createMockShipment();
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?dateFrom=2024-01-01",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
      });

      it("filters with dateTo", async () => {
        const shipment = createMockShipment();
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?dateTo=2024-12-31",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
      });

      it("filters with both dateFrom and dateTo", async () => {
        const shipment = createMockShipment();
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?dateFrom=2024-01-01&dateTo=2024-12-31",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toHaveLength(1);
      });

      it("ignores invalid dateFrom", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?dateFrom=not-a-date",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });

      it("ignores invalid dateTo", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?dateTo=invalid",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
      });
    });

    describe("Sorting", () => {
      it("sorts by trackingId ascending", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=trackingId&sortOrder=asc",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts by customerName", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=customerName",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts by origin", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=origin",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts by destination", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=destination",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts by status", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=status",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts by estimatedDelivery", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=estimatedDelivery",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("defaults to createdAt sort for unknown sortBy", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortBy=unknown_field",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("defaults to descending order when sortOrder is not asc", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortOrder=desc",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });

      it("sorts asc when sortOrder is asc", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?sortOrder=asc",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
      });
    });

    describe("Milestones", () => {
      it("includes last milestone for each shipment", async () => {
        const shipment = createMockShipment();
        const milestone = createMockMilestone({
          shipmentId: "s-001",
          type: "departed_origin",
          description: "Departed origin port",
          location: "Ningbo",
          occurredAt: new Date("2024-01-12T00:00:00.000Z"),
        });
        setupListResults({
          count: 1,
          shipments: [shipment],
          milestones: [milestone],
        });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data[0].lastMilestone).toEqual({
          type: "departed_origin",
          description: "Departed origin port",
          location: "Ningbo",
          occurredAt: "2024-01-12T00:00:00.000Z",
        });
      });

      it("keeps only the first milestone per shipment (most recent)", async () => {
        const shipment = createMockShipment();
        const milestones = [
          createMockMilestone({
            shipmentId: "s-001",
            type: "in_transit",
            description: "In transit",
          }),
          createMockMilestone({
            shipmentId: "s-001",
            type: "picked_up",
            description: "Picked up",
          }),
        ];
        setupListResults({ count: 1, shipments: [shipment], milestones });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        const body = res.json();
        expect(body.data[0].lastMilestone.type).toBe("in_transit");
        expect(body.data[0].lastMilestone.description).toBe("In transit");
      });

      it("returns null lastMilestone when no milestones exist", async () => {
        const shipment = createMockShipment();
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.json().data[0].lastMilestone).toBeNull();
      });

      it("maps milestones to correct shipments across multiple shipments", async () => {
        const s1 = createMockShipment({ id: "s-001" });
        const s2 = createMockShipment({ id: "s-002" });
        const ms1 = createMockMilestone({
          shipmentId: "s-001",
          type: "delivered",
          description: "Delivered s1",
        });
        const ms2 = createMockMilestone({
          shipmentId: "s-002",
          type: "exception",
          description: "Exception s2",
        });
        setupListResults({
          count: 2,
          shipments: [s1, s2],
          milestones: [ms1, ms2],
        });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        const body = res.json();
        expect(body.data).toHaveLength(2);
        expect(body.data[0].lastMilestone.description).toBe("Delivered s1");
        expect(body.data[1].lastMilestone.description).toBe("Exception s2");
      });

      it("skips milestone query when no shipments found", async () => {
        setupListResults({ count: 0, shipments: [], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().data).toEqual([]);
        expect(mockState.index).toBe(2);
      });
    });

    describe("Combined filters", () => {
      it("handles all filters combined", async () => {
        const shipment = createMockShipment();
        setupListResults({ count: 1, shipments: [shipment], milestones: [] });

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments?status=in_transit&search=SL&dateFrom=2024-01-01&dateTo=2024-12-31&sortBy=trackingId&sortOrder=asc&page=1&pageSize=50",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.pageSize).toBe(50);
        expect(body.data).toHaveLength(1);
      });
    });

    describe("Error handling", () => {
      it("returns 500 when database query fails", async () => {
        mockState.shouldThrow = true;

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: authBearerHeader("tenant-1"),
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe("Failed to retrieve shipments");
      });

      it("returns 500 with API key auth when database fails", async () => {
        mockState.shouldThrow = true;

        const res = await server.inject({
          method: "GET",
          url: "/api/shipments",
          headers: apiKeyHeader("valid-key"),
        });

        expect(res.statusCode).toBe(500);
        expect(res.json().success).toBe(false);
      });
    });
  });

  describe("POST /api/shipments", () => {
    it("returns 201 with success message", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/shipments",
        payload: { origin: "Shanghai", destination: "LA" },
        headers: {
          ...authBearerHeader("t1"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().success).toBe(true);
      expect(res.json().message).toBe("Shipment created");
      expect(res.json().data).toBeNull();
    });

    it("accepts empty payload", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/shipments",
        headers: {
          ...authBearerHeader("t1"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it("returns 401 without authentication", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/shipments",
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 403 without CSRF token", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/shipments",
        payload: {},
        headers: authBearerHeader("t1"),
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 500 with malformed CSRF token (timingSafeEqual length mismatch)", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/shipments",
        payload: {},
        headers: {
          ...authBearerHeader("t1"),
          "x-csrf-token": "csrf_invalid.token",
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /api/shipments/:trackingId", () => {
    it("returns shipment data with matching trackingId", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/shipments/SL-ABC123",
        headers: authBearerHeader("t1"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.trackingId).toBe("SL-ABC123");
    });

    it("handles tracking IDs with hyphens and numbers", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/shipments/SL-2024-001",
        headers: authBearerHeader("t1"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.trackingId).toBe("SL-2024-001");
    });

    it("handles URL-encoded tracking IDs", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/shipments/tracking%20id",
        headers: authBearerHeader("t1"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.trackingId).toBe("tracking id");
    });

    it("handles long tracking IDs within URL limits", async () => {
      const longId = "SL-" + "A".repeat(50);
      const res = await server.inject({
        method: "GET",
        url: `/api/shipments/${longId}`,
        headers: authBearerHeader("t1"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.trackingId).toBe(longId);
    });

    it("returns 401 without authentication", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/shipments/SL-123",
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
