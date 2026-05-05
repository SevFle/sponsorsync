import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  templates: [] as any[],
  configs: [] as any[],
  joinedConfigs: [] as any[],
  insertedTemplates: [] as any[],
  insertedConfigs: [] as any[],
  updatedTemplates: [] as any[],
  updatedConfigs: [] as any[],
  deletedTemplates: [] as any[],
  deletedConfigs: [] as any[],
  shouldThrow: false,
  queryIndex: 0,
  queryResults: [] as any[],
}));

function createChain(results?: any): any {
  const chain: any = {};
  const methods = [
    "from",
    "where",
    "orderBy",
    "limit",
    "innerJoin",
    "onConflictDoNothing",
  ];
  for (const method of methods) {
    chain[method] = () => chain;
  }
  chain.$dynamic = () => chain;
  chain.returning = () => {
    if (mockState.shouldThrow) {
      return Promise.reject(new Error("Database error"));
    }
    return Promise.resolve(results ?? []);
  };
  chain.then = (resolve: any, reject: any) => {
    if (mockState.shouldThrow) {
      reject(new Error("Database error"));
      return;
    }
    resolve(results ?? []);
  };
  return chain;
}

vi.mock("@shiplens/db", () => {
  return {
    db: {
      select: () => {
        const idx = mockState.queryIndex++;
        return createChain(mockState.queryResults[idx] ?? []);
      },
      insert: () => ({
        values: () => ({
          returning: () => {
            if (mockState.shouldThrow) return Promise.reject(new Error("Database error"));
            return Promise.resolve(mockState.insertedTemplates.length > 0 ? mockState.insertedTemplates : mockState.insertedConfigs.length > 0 ? mockState.insertedConfigs : []);
          },
          onConflictDoNothing: () => ({
            returning: () => {
              if (mockState.shouldThrow) return Promise.reject(new Error("Database error"));
              return Promise.resolve(mockState.insertedConfigs);
            },
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => {
              if (mockState.shouldThrow) return Promise.reject(new Error("Database error"));
              return Promise.resolve(mockState.updatedTemplates.length > 0 ? mockState.updatedTemplates : mockState.updatedConfigs);
            },
          }),
        }),
      }),
      delete: () => ({
        where: () => ({
          returning: () => {
            if (mockState.shouldThrow) return Promise.reject(new Error("Database error"));
            return Promise.resolve(mockState.deletedTemplates.length > 0 ? mockState.deletedTemplates : mockState.deletedConfigs);
          },
        }),
      }),
    },
    corridorMilestoneTemplates: {
      id: "id",
      corridorType: "corridorType",
      milestoneKey: "milestoneKey",
      milestoneLabel: "milestoneLabel",
      description: "description",
      milestoneOrder: "milestoneOrder",
      defaultNotificationEnabled: "defaultNotificationEnabled",
      estimatedDurationHours: "estimatedDurationHours",
      createdAt: "createdAt",
    },
    tenantCorridorConfigs: {
      id: "id",
      tenantId: "tenantId",
      corridorType: "corridorType",
      milestoneTemplateId: "milestoneTemplateId",
      notificationEnabled: "notificationEnabled",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    corridorTypeEnum: {
      enumValues: ["fcl", "ltl", "drayage"],
    },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: (c: any, v: any) => ({ col: c, val: v }),
  and: (...c: any[]) => c.filter(Boolean),
  asc: (c: any) => ({ dir: "asc", col: c }),
  sql: (strings: any) => strings,
  inArray: (c: any, v: any) => ({ col: c, vals: v }),
}));

import { buildServer } from "../../src/server";
import {
  authBearerHeader,
  DEFAULT_SECRET,
  createCsrfToken,
} from "../helpers/auth";
import { hashApiKey } from "../../src/plugins/auth";

const mockResolver = async (keyHash: string) => {
  if (keyHash === hashApiKey("valid-key")) return "tenant-cm";
  return null;
};

function createMockTemplate(overrides: Record<string, any> = {}) {
  return {
    id: "tmpl-001",
    corridorType: "fcl",
    milestoneKey: "BOOKING_CONFIRMED",
    milestoneLabel: "Booking Confirmed",
    description: "Carrier has confirmed the booking",
    milestoneOrder: 1,
    defaultNotificationEnabled: true,
    estimatedDurationHours: 24,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createMockConfig(overrides: Record<string, any> = {}) {
  return {
    id: "cfg-001",
    tenantId: "tenant-cm",
    corridorType: "fcl",
    milestoneTemplateId: "tmpl-001",
    notificationEnabled: true,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function resetMockState() {
  mockState.templates = [];
  mockState.configs = [];
  mockState.joinedConfigs = [];
  mockState.insertedTemplates = [];
  mockState.insertedConfigs = [];
  mockState.updatedTemplates = [];
  mockState.updatedConfigs = [];
  mockState.deletedTemplates = [];
  mockState.deletedConfigs = [];
  mockState.shouldThrow = false;
  mockState.queryIndex = 0;
  mockState.queryResults = [];
}

describe("Corridor Milestone Template Routes", () => {
  let server: Awaited<ReturnType<typeof buildServer>>;

  beforeEach(async () => {
    process.env.JWT_SECRET = DEFAULT_SECRET;
    resetMockState();
    server = await buildServer({ apiKeyResolver: mockResolver });
  });

  afterEach(async () => {
    await server.close();
  });

  describe("GET /api/corridor-milestones/templates", () => {
    it("returns 401 without authentication", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
      });
      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
    });

    it("returns all templates when no corridorType filter", async () => {
      mockState.queryResults = [
        [
          createMockTemplate({ id: "t1", corridorType: "fcl", milestoneOrder: 1 }),
          createMockTemplate({ id: "t2", corridorType: "ltl", milestoneOrder: 1 }),
          createMockTemplate({ id: "t3", corridorType: "drayage", milestoneOrder: 1 }),
        ],
      ];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(3);
      expect(body.data[0].milestoneKey).toBe("BOOKING_CONFIRMED");
    });

    it("filters templates by corridorType", async () => {
      mockState.queryResults = [
        [
          createMockTemplate({ id: "t1", corridorType: "fcl" }),
        ],
      ];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates?corridorType=fcl",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it("returns empty array when no templates match", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });

    it("accepts API key authentication", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
        headers: { "x-api-key": "valid-key" },
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(500);
      expect(res.json().success).toBe(false);
      expect(res.json().error).toBe("Failed to retrieve milestone templates");
    });

    it("serializes dates correctly", async () => {
      const template = createMockTemplate({
        createdAt: new Date("2024-06-15T12:30:00.000Z"),
      });
      mockState.queryResults = [[template]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.json().data[0].createdAt).toBe("2024-06-15T12:30:00.000Z");
    });

    it("ignores invalid corridorType filter", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates?corridorType=invalid",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/corridor-milestones/templates/:templateId", () => {
    it("returns a single template by ID", async () => {
      const template = createMockTemplate({ id: "tmpl-001" });
      mockState.queryResults = [[template]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates/tmpl-001",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.id).toBe("tmpl-001");
      expect(res.json().data.milestoneKey).toBe("BOOKING_CONFIRMED");
    });

    it("returns 404 when template not found", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates/nonexistent",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("Template not found");
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates/tmpl-001",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/templates/tmpl-001",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /api/corridor-milestones/templates", () => {
    it("creates a new template successfully", async () => {
      const created = createMockTemplate({ id: "tmpl-new", milestoneKey: "NEW_MILESTONE", milestoneLabel: "New Milestone" });
      mockState.insertedTemplates = [created];
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "fcl",
          milestoneKey: "NEW_MILESTONE",
          milestoneLabel: "New Milestone",
          description: "A new milestone",
          milestoneOrder: 20,
          defaultNotificationEnabled: false,
          estimatedDurationHours: 48,
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().success).toBe(true);
      expect(res.json().data.milestoneKey).toBe("NEW_MILESTONE");
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: { corridorType: "fcl" },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Missing required fields");
    });

    it("returns 400 for invalid corridorType", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "invalid",
          milestoneKey: "TEST",
          milestoneLabel: "Test",
          milestoneOrder: 1,
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Invalid corridorType");
    });

    it("returns 400 when body is null", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "fcl",
          milestoneKey: "TEST",
          milestoneLabel: "Test",
          milestoneOrder: 1,
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 403 without CSRF token", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "fcl",
          milestoneKey: "TEST",
          milestoneLabel: "Test",
          milestoneOrder: 1,
        },
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(403);
    });

    it("uses defaults for optional fields", async () => {
      const created = createMockTemplate({
        id: "tmpl-defaults",
        defaultNotificationEnabled: true,
        estimatedDurationHours: null,
      });
      mockState.insertedTemplates = [created];
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "ltl",
          milestoneKey: "MINIMAL",
          milestoneLabel: "Minimal",
          milestoneOrder: 5,
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/templates",
        payload: {
          corridorType: "fcl",
          milestoneKey: "TEST",
          milestoneLabel: "Test",
          milestoneOrder: 1,
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /api/corridor-milestones/templates/:templateId", () => {
    it("updates a template successfully", async () => {
      const existing = createMockTemplate({ id: "tmpl-001" });
      const updated = createMockTemplate({
        id: "tmpl-001",
        milestoneLabel: "Updated Label",
      });
      mockState.queryResults = [[existing]];
      mockState.updatedTemplates = [updated];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/tmpl-001",
        payload: { milestoneLabel: "Updated Label" },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.milestoneLabel).toBe("Updated Label");
    });

    it("returns 404 when template not found", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/nonexistent",
        payload: { milestoneLabel: "Updated" },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 when no fields provided", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/tmpl-001",
        payload: {},
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe("No fields provided for update");
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/tmpl-001",
        payload: { milestoneLabel: "Test" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("updates multiple fields at once", async () => {
      const existing = createMockTemplate({ id: "tmpl-001" });
      const updated = createMockTemplate({
        id: "tmpl-001",
        milestoneLabel: "New Label",
        description: "New Description",
        milestoneOrder: 99,
      });
      mockState.queryResults = [[existing]];
      mockState.updatedTemplates = [updated];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/tmpl-001",
        payload: {
          milestoneLabel: "New Label",
          description: "New Description",
          milestoneOrder: 99,
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/templates/tmpl-001",
        payload: { milestoneLabel: "Test" },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /api/corridor-milestones/templates/:templateId", () => {
    it("deletes a template successfully", async () => {
      mockState.deletedTemplates = [createMockTemplate({ id: "tmpl-001" })];
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/templates/tmpl-001",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().message).toBe("Template deleted");
    });

    it("returns 404 when template not found", async () => {
      mockState.deletedTemplates = [];
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/templates/nonexistent",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/templates/tmpl-001",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/templates/tmpl-001",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /api/corridor-milestones/corridor/:corridorType/milestones", () => {
    it("returns milestones with tenant configuration", async () => {
      mockState.queryResults = [
        [
          createMockTemplate({ id: "t1", corridorType: "fcl", milestoneOrder: 1 }),
          createMockTemplate({ id: "t2", corridorType: "fcl", milestoneKey: "CONTAINER_RELEASED", milestoneOrder: 2 }),
        ],
        [
          createMockConfig({
            id: "c1",
            tenantId: "tenant-cm",
            corridorType: "fcl",
            milestoneTemplateId: "t1",
            notificationEnabled: false,
          }),
        ],
      ];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/corridor/fcl/milestones",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.corridorType).toBe("fcl");
      expect(body.data).toHaveLength(2);
      expect(body.data[0].tenantConfigured).toBe(true);
      expect(body.data[0].notificationEnabled).toBe(false);
      expect(body.data[1].tenantConfigured).toBe(false);
      expect(body.data[1].notificationEnabled).toBe(true);
    });

    it("returns 400 for invalid corridorType", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/corridor/invalid/milestones",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Invalid corridorType");
    });

    it("returns milestones without tenant config when no configs exist", async () => {
      mockState.queryResults = [
        [createMockTemplate({ id: "t1", corridorType: "fcl" })],
        [],
      ];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/corridor/fcl/milestones",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data[0].tenantConfigured).toBe(false);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/corridor/fcl/milestones",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/corridor/fcl/milestones",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /api/corridor-milestones/configs/assign", () => {
    it("assigns templates to tenant successfully", async () => {
      const templates = [
        createMockTemplate({ id: "t1", corridorType: "fcl" }),
        createMockTemplate({ id: "t2", corridorType: "fcl" }),
      ];
      const configs = [
        createMockConfig({ id: "c1", milestoneTemplateId: "t1" }),
        createMockConfig({ id: "c2", milestoneTemplateId: "t2" }),
      ];
      mockState.queryResults = [templates];
      mockState.insertedConfigs = configs;
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: {
          corridorType: "fcl",
          milestoneTemplateIds: ["t1", "t2"],
        },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().success).toBe(true);
      expect(res.json().data).toHaveLength(2);
    });

    it("returns 400 when milestoneTemplateIds is missing", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl" },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("Missing required fields");
    });

    it("returns 400 when milestoneTemplateIds is empty", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl", milestoneTemplateIds: [] },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when body is null", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 for invalid corridorType", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "invalid", milestoneTemplateIds: ["t1"] },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when template IDs don't match corridorType", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl", milestoneTemplateIds: ["t1"] },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toContain("not found or do not match");
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl", milestoneTemplateIds: ["t1"] },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 403 without CSRF token", async () => {
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl", milestoneTemplateIds: ["t1"] },
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(403);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "POST",
        url: "/api/corridor-milestones/configs/assign",
        payload: { corridorType: "fcl", milestoneTemplateIds: ["t1"] },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /api/corridor-milestones/configs", () => {
    it("returns all tenant corridor configs", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/configs",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/configs",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "GET",
        url: "/api/corridor-milestones/configs",
        headers: authBearerHeader("tenant-cm"),
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /api/corridor-milestones/configs/:configId", () => {
    it("updates a tenant config successfully", async () => {
      const existing = createMockConfig({ id: "cfg-001", tenantId: "tenant-cm" });
      const updated = createMockConfig({
        id: "cfg-001",
        notificationEnabled: false,
      });
      mockState.queryResults = [[existing]];
      mockState.updatedConfigs = [updated];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/cfg-001",
        payload: { notificationEnabled: false },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.notificationEnabled).toBe(false);
    });

    it("returns 404 when config not found", async () => {
      mockState.queryResults = [[]];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/nonexistent",
        payload: { notificationEnabled: false },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 when no fields provided", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/cfg-001",
        payload: {},
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/cfg-001",
        payload: { notificationEnabled: false },
      });
      expect(res.statusCode).toBe(401);
    });

    it("updates isActive field", async () => {
      const existing = createMockConfig({ id: "cfg-001", tenantId: "tenant-cm" });
      const updated = createMockConfig({ id: "cfg-001", isActive: false });
      mockState.queryResults = [[existing]];
      mockState.updatedConfigs = [updated];
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/cfg-001",
        payload: { isActive: false },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.isActive).toBe(false);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "PUT",
        url: "/api/corridor-milestones/configs/cfg-001",
        payload: { notificationEnabled: false },
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /api/corridor-milestones/configs/:configId", () => {
    it("deletes a tenant config successfully", async () => {
      mockState.deletedConfigs = [createMockConfig({ id: "cfg-001" })];
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/configs/cfg-001",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().message).toBe("Configuration removed");
    });

    it("returns 404 when config not found", async () => {
      mockState.deletedConfigs = [];
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/configs/nonexistent",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 401 without auth", async () => {
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/configs/cfg-001",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockState.shouldThrow = true;
      const res = await server.inject({
        method: "DELETE",
        url: "/api/corridor-milestones/configs/cfg-001",
        headers: {
          ...authBearerHeader("tenant-cm"),
          "x-csrf-token": createCsrfToken(),
        },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
