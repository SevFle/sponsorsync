import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/deliverables/route";
import { GET as GetById, PATCH, DELETE } from "@/app/api/deliverables/[id]/route";

describe("GET /api/deliverables", () => {
  it("returns empty deliverables array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ deliverables: [] });
  });
});

describe("POST /api/deliverables", () => {
  it("creates a deliverable and returns it with status 201", async () => {
    const deliverableData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Newsletter Mention",
      dueDate: "2025-04-01",
    };
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify(deliverableData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deliverable).toEqual(deliverableData);
  });

  it("handles deliverable with description", async () => {
    const deliverableData = {
      dealId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Podcast Ad Read",
      description: "60-second mid-roll ad",
    };
    const request = new Request("http://localhost:3000/api/deliverables", {
      method: "POST",
      body: JSON.stringify(deliverableData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.deliverable.description).toBe("60-second mid-roll ad");
  });
});

describe("GET /api/deliverables/[id]", () => {
  it("returns deliverable with matching id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/deliverables/del-456"),
      { params: Promise.resolve({ id: "del-456" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverable).toEqual({ id: "del-456" });
  });
});

describe("PATCH /api/deliverables/[id]", () => {
  it("updates deliverable and returns merged data", async () => {
    const updateData = { status: "submitted" };
    const request = new Request("http://localhost:3000/api/deliverables/del-456", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "del-456" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deliverable).toEqual({ id: "del-456", status: "submitted" });
  });
});

describe("DELETE /api/deliverables/[id]", () => {
  it("returns deleted true with status 200", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/deliverables/del-456", { method: "DELETE" }),
      { params: Promise.resolve({ id: "del-456" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
