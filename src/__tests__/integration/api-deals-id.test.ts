import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as GetById, PATCH, DELETE } from "@/app/api/deals/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealById: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealById, updateDeal, deleteDeal } from "@/lib/db/queries/deals";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/deals/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GetById(
      new Request("http://localhost:3000/api/deals/deal-123"),
      { params: Promise.resolve({ id: "deal-123" }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns deal with matching id", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-123",
      title: "Test Deal",
    });
    const response = await GetById(
      new Request("http://localhost:3000/api/deals/deal-123"),
      { params: Promise.resolve({ id: "deal-123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal).toEqual({ id: "deal-123", title: "Test Deal" });
  });

  it("returns 404 when deal not found", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await GetById(
      new Request("http://localhost:3000/api/deals/nonexistent"),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(response.status).toBe(404);
  });

  it("handles uuid format id", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: uuid,
      title: "UUID Deal",
    });
    const response = await GetById(
      new Request(`http://localhost:3000/api/deals/${uuid}`),
      { params: Promise.resolve({ id: uuid }) }
    );
    const body = await response.json();

    expect(body.deal.id).toBe(uuid);
  });
});

describe("PATCH /api/deals/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/deals/deal-123", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "deal-123" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid body data", async () => {
    const request = new Request("http://localhost:3000/api/deals/deal-123", {
      method: "PATCH",
      body: JSON.stringify({ sponsorId: "not-a-uuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "deal-123" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/deals/deal-123", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "deal-123" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("updates deal and returns merged data", async () => {
    const updateData = { title: "Updated Deal", status: "active" };
    (updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-123",
      ...updateData,
    });
    const request = new Request("http://localhost:3000/api/deals/deal-123", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "deal-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal).toEqual({ id: "deal-123", ...updateData });
  });

  it("preserves id even if body contains different id", async () => {
    (updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "original-id",
      title: "Test",
    });
    const request = new Request("http://localhost:3000/api/deals/original-id", {
      method: "PATCH",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "original-id" }),
    });
    const body = await response.json();

    expect(body.deal.id).toBe("original-id");
  });

  it("returns 404 when updating nonexistent deal", async () => {
    (updateDeal as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const request = new Request("http://localhost:3000/api/deals/nonexistent", {
      method: "PATCH",
      body: JSON.stringify({ title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/deals/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await DELETE(
      new Request("http://localhost:3000/api/deals/deal-123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "deal-123" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns deleted true with status 200", async () => {
    (deleteDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-123",
    });
    const response = await DELETE(
      new Request("http://localhost:3000/api/deals/deal-123", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "deal-123" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });

  it("calls deleteDeal with the correct id", async () => {
    (deleteDeal as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "deal-456",
    });
    await DELETE(
      new Request("http://localhost:3000/api/deals/deal-456", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "deal-456" }) }
    );
    expect(deleteDeal).toHaveBeenCalledWith("deal-456");
  });

  it("returns 404 when deleting nonexistent deal", async () => {
    (deleteDeal as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await DELETE(
      new Request("http://localhost:3000/api/deals/nonexistent", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "nonexistent" }) }
    );
    expect(response.status).toBe(404);
  });
});
