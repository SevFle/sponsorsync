import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as GetById,
  PATCH,
  DELETE,
} from "@/app/api/deliverables/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deliverables", () => ({
  getDeliverableById: vi.fn(),
  updateDeliverable: vi.fn(),
  deleteDeliverable: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getDeliverableById,
  updateDeliverable,
  deleteDeliverable,
} from "@/lib/db/queries/deliverables";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/deliverables/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GetById(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deliverables/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns deliverable scoped to user", async () => {
    (getDeliverableById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      title: "Test Deliverable",
    });
    const response = await GetById(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverable).toEqual({ id: UUID, title: "Test Deliverable" });
    expect(getDeliverableById).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns 404 when deliverable not found", async () => {
    (getDeliverableById as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
    const response = await GetById(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Deliverable not found");
  });

  it("returns 400 for empty string id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deliverables/"),
      { params: Promise.resolve({ id: "" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for numeric id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deliverables/12345"),
      { params: Promise.resolve({ id: "12345" }) }
    );
    expect(response.status).toBe(400);
  });

  it("includes validation details on bad id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deliverables/bad"),
      { params: Promise.resolve({ id: "bad" }) }
    );
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});

describe("PATCH /api/deliverables/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const request = new Request(
      "http://localhost:3000/api/deliverables/not-a-uuid",
      {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid body data", async () => {
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ dealId: "not-a-uuid" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates deliverable scoped to user", async () => {
    const updateData = { title: "Updated Deliverable" };
    (updateDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      ...updateData,
    });
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverable).toEqual({ id: UUID, ...updateData });
    expect(updateDeliverable).toHaveBeenCalledWith(
      UUID,
      updateData,
      "user-1"
    );
  });

  it("returns 404 when updating nonexistent deliverable", async () => {
    (updateDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title: "Test" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Deliverable not found");
  });

  it("accepts valid partial update with empty body", async () => {
    (updateDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      title: "Existing",
    });
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(200);
  });

  it("returns validation details on bad body", async () => {
    const request = new Request(
      `http://localhost:3000/api/deliverables/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ dealId: "bad" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});

describe("DELETE /api/deliverables/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await DELETE(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/deliverables/not-a-uuid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns deleted true scoped to user", async () => {
    (deleteDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
    });
    const response = await DELETE(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
    expect(deleteDeliverable).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns 404 when deleting nonexistent deliverable", async () => {
    (deleteDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
    const response = await DELETE(
      new Request(`http://localhost:3000/api/deliverables/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Deliverable not found");
  });

  it("calls deleteDeliverable with correct id and userId", async () => {
    const delId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    (deleteDeliverable as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: delId,
    });
    await DELETE(
      new Request(`http://localhost:3000/api/deliverables/${delId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: delId }) }
    );
    expect(deleteDeliverable).toHaveBeenCalledWith(delId, "user-1");
  });
});
