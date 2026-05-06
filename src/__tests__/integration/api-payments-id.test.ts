import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as GetById,
  PATCH,
  DELETE,
} from "@/app/api/payments/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/payments", () => ({
  getPaymentById: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getPaymentById,
  updatePayment,
  deletePayment,
} from "@/lib/db/queries/payments";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/payments/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GetById(
      new Request(`http://localhost:3000/api/payments/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/payments/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns payment scoped to user", async () => {
    (getPaymentById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      amount: 2500,
      status: "paid",
    });
    const response = await GetById(
      new Request(`http://localhost:3000/api/payments/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payment).toEqual({ id: UUID, amount: 2500, status: "paid" });
    expect(getPaymentById).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns 404 when payment not found", async () => {
    (getPaymentById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await GetById(
      new Request(`http://localhost:3000/api/payments/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Payment not found");
  });

  it("returns 400 for empty string id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/payments/"),
      { params: Promise.resolve({ id: "" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for numeric id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/payments/999"),
      { params: Promise.resolve({ id: "999" }) }
    );
    expect(response.status).toBe(400);
  });

  it("includes validation details on bad id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/payments/xyz"),
      { params: Promise.resolve({ id: "xyz" }) }
    );
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});

describe("PATCH /api/payments/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
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
      "http://localhost:3000/api/payments/not-a-uuid",
      {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
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
      `http://localhost:3000/api/payments/${UUID}`,
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
      `http://localhost:3000/api/payments/${UUID}`,
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

  it("updates payment scoped to user", async () => {
    const updateData = { status: "paid" };
    (updatePayment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      ...updateData,
    });
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
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
    expect(body.payment).toEqual({ id: UUID, ...updateData });
    expect(updatePayment).toHaveBeenCalledWith(UUID, updateData, "user-1");
  });

  it("returns 404 when updating nonexistent payment", async () => {
    (updatePayment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "paid" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Payment not found");
  });

  it("accepts valid partial update with empty body", async () => {
    (updatePayment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      amount: 1000,
    });
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
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

  it("returns 400 when amount is negative", async () => {
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ amount: -100 }),
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

  it("returns validation details on bad body", async () => {
    const request = new Request(
      `http://localhost:3000/api/payments/${UUID}`,
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

describe("DELETE /api/payments/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await DELETE(
      new Request(`http://localhost:3000/api/payments/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/payments/not-a-uuid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns deleted true scoped to user", async () => {
    (deletePayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: UUID });
    const response = await DELETE(
      new Request(`http://localhost:3000/api/payments/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
    expect(deletePayment).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns 404 when deleting nonexistent payment", async () => {
    (deletePayment as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await DELETE(
      new Request(`http://localhost:3000/api/payments/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Payment not found");
  });

  it("calls deletePayment with correct id and userId", async () => {
    const paymentId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    (deletePayment as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: paymentId,
    });
    await DELETE(
      new Request(`http://localhost:3000/api/payments/${paymentId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: paymentId }) }
    );
    expect(deletePayment).toHaveBeenCalledWith(paymentId, "user-1");
  });
});
