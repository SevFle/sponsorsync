import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsByUserId: vi.fn().mockResolvedValue([]),
  getDealById: vi.fn().mockResolvedValue(null),
  updateDeal: vi.fn().mockResolvedValue(null),
  deleteDeal: vi.fn().mockResolvedValue(null),
  getDealsBySponsorId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverablesByUserId: vi.fn().mockResolvedValue([]),
  getDeliverableById: vi.fn().mockResolvedValue(null),
  updateDeliverable: vi.fn().mockResolvedValue(null),
  deleteDeliverable: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentsByUserId: vi.fn().mockResolvedValue([]),
  getPaymentById: vi.fn().mockResolvedValue(null),
  updatePayment: vi.fn().mockResolvedValue(null),
  deletePayment: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorsByUserId: vi.fn().mockResolvedValue([]),
  getSponsorById: vi.fn().mockResolvedValue(null),
  updateSponsor: vi.fn().mockResolvedValue(null),
  deleteSponsor: vi.fn().mockResolvedValue(null),
  createSponsor: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/db/queries/integrations", () => ({
  getIntegrationByPlatform: vi.fn().mockResolvedValue(null),
  deleteIntegration: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getUserSettings: vi.fn().mockResolvedValue(null),
  getUserProfile: vi.fn().mockResolvedValue(null),
  updateUserProfile: vi.fn().mockResolvedValue(null),
  getNotificationPreferences: vi.fn().mockResolvedValue(null),
  upsertNotificationPreferences: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  getNotificationsByUserId: vi.fn().mockResolvedValue([]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
  markNotificationRead: vi.fn().mockResolvedValue(null),
  markAllNotificationsRead: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  deliverables: {
    id: "id",
    dealId: "dealId",
    title: "title",
    description: "description",
    status: "status",
    dueDate: "dueDate",
    completedDate: "completedDate",
    verificationData: "verificationData",
    notes: "notes",
  },
  deals: { id: "id", title: "title", userId: "userId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => val),
}));

import { getServerSession } from "next-auth";

function mockNoAuth() {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNoAuth();
});

describe("Unauthenticated access rejection - all protected API routes", () => {
  const UUID = "550e8400-e29b-41d4-a716-446655440000";

  it("GET /api/dashboard returns 401", async () => {
    const { GET } = await import("@/app/api/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/sponsors returns 401", async () => {
    const { GET } = await import("@/app/api/sponsors/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/sponsors returns 401", async () => {
    const { POST } = await import("@/app/api/sponsors/route");
    const req = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/sponsors/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/sponsors/[id]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/sponsors/" + UUID),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/sponsors/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/sponsors/[id]/route");
    const req = new Request("http://localhost:3000/api/sponsors/" + UUID, {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/sponsors/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/sponsors/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/sponsors/" + UUID, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/deals returns 401", async () => {
    const { GET } = await import("@/app/api/deals/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/deals returns 401", async () => {
    const { POST } = await import("@/app/api/deals/route");
    const req = new Request("http://localhost:3000/api/deals", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/deals/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/deals/[id]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/deals/" + UUID),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/deals/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/deals/[id]/route");
    const req = new Request("http://localhost:3000/api/deals/" + UUID, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/deals/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/deals/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/deals/" + UUID, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/deliverables returns 401", async () => {
    const { GET } = await import("@/app/api/deliverables/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/deliverables returns 401", async () => {
    const { POST } = await import("@/app/api/deliverables/route");
    const req = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/deliverables/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/deliverables/[id]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/deliverables/" + UUID),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/deliverables/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/deliverables/[id]/route");
    const req = new Request("http://localhost:3000/api/deliverables/" + UUID, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/deliverables/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/deliverables/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/deliverables/" + UUID, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/deliverables/verify returns 401", async () => {
    const { POST } = await import("@/app/api/deliverables/verify/route");
    const req = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify({ deliverableId: UUID, dealId: UUID, dealTitle: "Test", title: "Test", status: "pending" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/deliverables/verification-report returns 401", async () => {
    const { GET } = await import("@/app/api/deliverables/verification-report/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/payments returns 401", async () => {
    const { GET } = await import("@/app/api/payments/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/payments returns 401", async () => {
    const { POST } = await import("@/app/api/payments/route");
    const req = new Request("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/payments/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/payments/[id]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/payments/" + UUID),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/payments/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/payments/[id]/route");
    const req = new Request("http://localhost:3000/api/payments/" + UUID, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/payments/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/payments/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/payments/" + UUID, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/templates returns 401", async () => {
    const { GET } = await import("@/app/api/templates/route");
    const res = await GET(new Request("http://localhost:3000/api/templates"));
    expect(res.status).toBe(401);
  });

  it("POST /api/templates returns 401", async () => {
    const { POST } = await import("@/app/api/templates/route");
    const req = new Request("http://localhost:3000/api/templates", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/templates/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/templates/[id]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/templates/tmpl-1"),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/templates/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/templates/[id]/route");
    const req = new Request("http://localhost:3000/api/templates/tmpl-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "tmpl-1" }) });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/templates/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/templates/[id]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/templates/tmpl-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/integrations returns 401", async () => {
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/integrations/connect returns 401", async () => {
    const { POST } = await import("@/app/api/integrations/connect/route");
    const req = new Request("http://localhost:3000/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify({ platform: "buzzsprout", apiKey: "key" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/integrations/[platform] returns 401", async () => {
    const { GET } = await import("@/app/api/integrations/[platform]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/integrations/buzzsprout"),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/integrations/[platform] returns 401", async () => {
    const { DELETE } = await import("@/app/api/integrations/[platform]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/integrations/buzzsprout", { method: "DELETE" }),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/settings returns 401", async () => {
    const { GET } = await import("@/app/api/settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PUT /api/settings returns 401", async () => {
    const { PUT } = await import("@/app/api/settings/route");
    const req = new Request("http://localhost:3000/api/settings", {
      method: "PUT",
      body: JSON.stringify({ theme: "dark" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/settings/notifications returns 401", async () => {
    const { GET } = await import("@/app/api/settings/notifications/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PUT /api/settings/notifications returns 401", async () => {
    const { PUT } = await import("@/app/api/settings/notifications/route");
    const req = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ email: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/settings/profile returns 401", async () => {
    const { GET } = await import("@/app/api/settings/profile/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PUT /api/settings/profile returns 401", async () => {
    const { PUT } = await import("@/app/api/settings/profile/route");
    const req = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications returns 401", async () => {
    const { GET } = await import("@/app/api/notifications/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("PUT /api/notifications returns 401", async () => {
    const { PUT } = await import("@/app/api/notifications/route");
    const req = new Request("http://localhost:3000/api/notifications", {
      method: "PUT",
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });
});

describe("Unauthenticated access - session without user.id", () => {
  beforeEach(() => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });
  });

  it("GET /api/dashboard returns 401", async () => {
    const { GET } = await import("@/app/api/dashboard/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/templates returns 401", async () => {
    const { GET } = await import("@/app/api/templates/route");
    const res = await GET(new Request("http://localhost:3000/api/templates"));
    expect(res.status).toBe(401);
  });

  it("GET /api/integrations returns 401", async () => {
    const { GET } = await import("@/app/api/integrations/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/deliverables returns 401", async () => {
    const { GET } = await import("@/app/api/deliverables/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/sponsors returns 401", async () => {
    const { GET } = await import("@/app/api/sponsors/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/payments returns 401", async () => {
    const { GET } = await import("@/app/api/payments/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/settings returns 401", async () => {
    const { GET } = await import("@/app/api/settings/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET /api/payments/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/payments/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await GET(
      new Request(`http://localhost:3000/api/payments/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/payments/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/payments/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await PATCH(
      new Request(`http://localhost:3000/api/payments/${UUID}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/payments/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/payments/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await DELETE(
      new Request(`http://localhost:3000/api/payments/${UUID}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/deals/[id] returns 401", async () => {
    const { GET } = await import("@/app/api/deals/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await GET(
      new Request(`http://localhost:3000/api/deals/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("PATCH /api/deals/[id] returns 401", async () => {
    const { PATCH } = await import("@/app/api/deals/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await PATCH(
      new Request(`http://localhost:3000/api/deals/${UUID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Test" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/deals/[id] returns 401", async () => {
    const { DELETE } = await import("@/app/api/deals/[id]/route");
    const UUID = "550e8400-e29b-41d4-a716-446655440000";
    const res = await DELETE(
      new Request(`http://localhost:3000/api/deals/${UUID}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/integrations/connect returns 401", async () => {
    const { POST } = await import("@/app/api/integrations/connect/route");
    const req = new Request("http://localhost:3000/api/integrations/connect", {
      method: "POST",
      body: JSON.stringify({ platform: "buzzsprout", apiKey: "key" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("GET /api/integrations/[platform] returns 401", async () => {
    const { GET } = await import("@/app/api/integrations/[platform]/route");
    const res = await GET(
      new Request("http://localhost:3000/api/integrations/buzzsprout"),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(res.status).toBe(401);
  });

  it("DELETE /api/integrations/[platform] returns 401", async () => {
    const { DELETE } = await import("@/app/api/integrations/[platform]/route");
    const res = await DELETE(
      new Request("http://localhost:3000/api/integrations/buzzsprout", { method: "DELETE" }),
      { params: Promise.resolve({ platform: "buzzsprout" }) }
    );
    expect(res.status).toBe(401);
  });
});
