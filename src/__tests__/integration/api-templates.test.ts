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

describe("POST /api/templates edge cases", () => {
  it("handles template with all fields populated", async () => {
    const templateData = {
      name: "Full Template",
      subject: "Subject with {{variable}}",
      body: "<h1>Title</h1><p>Body with {{content}}</p>",
      category: "follow_up",
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

  it("handles template with minimal fields", async () => {
    const templateData = { name: "Minimal" };
    const request = new Request("http://localhost:3000/api/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("Minimal");
  });

  it("handles template with empty body", async () => {
    const templateData = { name: "Empty Body", body: "" };
    const request = new Request("http://localhost:3000/api/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("handles template with special characters in fields", async () => {
    const templateData = {
      name: "O'Brien's Template",
      subject: "Hello <script>alert('xss')</script>",
      body: '<p>"Quoted" & escaped</p>',
    };
    const request = new Request("http://localhost:3000/api/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("O'Brien's Template");
  });
});

describe("PATCH /api/templates/[id] edge cases", () => {
  it("handles partial update with single field", async () => {
    const request = new Request("http://localhost:3000/api/templates/tmpl-1", {
      method: "PATCH",
      body: JSON.stringify({ subject: "New Subject" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "tmpl-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template).toEqual({ id: "tmpl-1", subject: "New Subject" });
  });

  it("handles update with multiple fields", async () => {
    const updateData = { name: "Updated", subject: "New Sub", body: "<p>New body</p>" };
    const request = new Request("http://localhost:3000/api/templates/tmpl-2", {
      method: "PATCH",
      body: JSON.stringify(updateData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "tmpl-2" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template).toEqual({ id: "tmpl-2", ...updateData });
  });

  it("preserves id through update", async () => {
    const request = new Request("http://localhost:3000/api/templates/special-id-123", {
      method: "PATCH",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "special-id-123" }) });
    const body = await response.json();

    expect(body.template.id).toBe("special-id-123");
    expect(body.template.name).toBe("Test");
  });
});

describe("GET /api/templates/[id] edge cases", () => {
  it("handles UUID format id", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const response = await GetById(
      new Request(`http://localhost:3000/api/templates/${uuid}`),
      { params: Promise.resolve({ id: uuid }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.template.id).toBe(uuid);
  });
});
