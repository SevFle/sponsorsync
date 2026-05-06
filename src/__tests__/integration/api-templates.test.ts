import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/templates/route";
import { GET as GetById, PATCH, DELETE } from "@/app/api/templates/[id]/route";

describe("GET /api/templates", () => {
  it("returns empty templates array", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ templates: [] });
  });
});

describe("POST /api/templates", () => {
  it("creates a template and returns it with status 201", async () => {
    const templateData = {
      name: "Welcome Email",
      subject: "Welcome to {{deal}}",
      body: "<p>Hello!</p>",
      category: "onboarding",
    };
    const request = new Request("http://localhost:3000/api/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.template).toEqual(templateData);
  });
});

describe("GET /api/templates/[id]", () => {
  it("returns template with matching id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/templates/tmpl-789"),
      { params: Promise.resolve({ id: "tmpl-789" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template).toEqual({ id: "tmpl-789" });
  });
});

describe("PATCH /api/templates/[id]", () => {
  it("updates template and returns merged data", async () => {
    const updateData = { name: "Updated Template" };
    const request = new Request("http://localhost:3000/api/templates/tmpl-789", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "tmpl-789" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template).toEqual({ id: "tmpl-789", name: "Updated Template" });
  });
});

describe("DELETE /api/templates/[id]", () => {
  it("returns deleted true with status 200", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/templates/tmpl-789", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tmpl-789" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });
});
