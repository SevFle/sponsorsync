import { describe, it, expect } from "vitest";
import { GET as GetById, PATCH, DELETE } from "@/app/api/deals/[id]/route";

describe("GET /api/deals/[id]", () => {
  it("returns deal with matching id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deals/deal-123"),
      { params: Promise.resolve({ id: "deal-123" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal).toEqual({ id: "deal-123" });
  });

  it("handles uuid format id", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const response = await GetById(
      new Request(`http://localhost:3000/api/deals/${uuid}`),
      { params: Promise.resolve({ id: uuid }) }
    );
    const body = await response.json();

    expect(body.deal.id).toBe(uuid);
  });
});

describe("PATCH /api/deals/[id]", () => {
  it("updates deal and returns merged data", async () => {
    const updateData = { title: "Updated Deal", status: "active" };
    const request = new Request("http://localhost:3000/api/deals/deal-123", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "deal-123" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deal).toEqual({ id: "deal-123", ...updateData });
  });

  it("preserves id even if body contains different id", async () => {
    const request = new Request("http://localhost:3000/api/deals/original-id", {
      method: "PATCH",
      body: JSON.stringify({ id: "different-id", title: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "original-id" }) });
    const body = await response.json();

    expect(body.deal.id).toBe("original-id");
  });
});

describe("DELETE /api/deals/[id]", () => {
  it("returns deleted true with status 200", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/deals/deal-123", { method: "DELETE" }),
      { params: Promise.resolve({ id: "deal-123" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
