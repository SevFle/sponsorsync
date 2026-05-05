import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/sponsors/route";
import { GET as GetById, PATCH, DELETE } from "@/app/api/sponsors/[id]/route";

describe("GET /api/sponsors", () => {
  it("returns empty sponsors array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ sponsors: [] });
  });
});

describe("POST /api/sponsors", () => {
  it("creates a sponsor and returns it with status 201", async () => {
    const sponsorData = { name: "Acme Corp", email: "sponsor@acme.com" };
    const request = new Request("http://localhost:3000/api/sponsors", {
      method: "POST",
      body: JSON.stringify(sponsorData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.sponsor).toEqual(sponsorData);
  });
});

describe("GET /api/sponsors/[id]", () => {
  it("returns sponsor with matching id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/sponsors/sp-123"),
      { params: { id: "sp-123" } }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsor).toEqual({ id: "sp-123" });
  });
});

describe("PATCH /api/sponsors/[id]", () => {
  it("updates sponsor and returns merged data", async () => {
    const updateData = { name: "Updated Corp" };
    const request = new Request("http://localhost:3000/api/sponsors/sp-123", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: { id: "sp-123" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsor).toEqual({ id: "sp-123", name: "Updated Corp" });
  });
});

describe("DELETE /api/sponsors/[id]", () => {
  it("returns deleted true with status 200", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/sponsors/sp-123", { method: "DELETE" }),
      { params: { id: "sp-123" } }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
