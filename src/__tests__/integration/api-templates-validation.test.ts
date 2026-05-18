import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/templates/route";
import { PATCH } from "@/app/api/templates/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockCreateTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();

vi.mock("@/lib/db/queries/templates", () => ({
  getTemplatesByUserIdFiltered: vi.fn().mockResolvedValue([]),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  getTemplateById: vi.fn().mockResolvedValue({ id: "tmpl-1" }),
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
  deleteTemplate: vi.fn().mockResolvedValue({ id: "tmpl-1" }),
  getDefaultTemplates: vi.fn().mockResolvedValue([]),
  getTemplatesByUserId: vi.fn().mockResolvedValue([]),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-new", ...data }));
  mockUpdateTemplate.mockImplementation((id: string, data: Record<string, unknown>) =>
    Promise.resolve({ id, ...data })
  );
});

function postRequest(data: unknown) {
  return new Request("http://localhost:3000/api/templates", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

function patchRequest(id: string, data: unknown) {
  return new Request(`http://localhost:3000/api/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/templates - validation boundaries", () => {
  it("accepts name at exactly 255 characters", async () => {
    const response = await POST(
      postRequest({ name: "a".repeat(255), body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(201);
  });

  it("rejects name at 256 characters", async () => {
    const response = await POST(
      postRequest({ name: "a".repeat(256), body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.details.name).toBeDefined();
  });

  it("rejects empty name after trimming", async () => {
    const response = await POST(
      postRequest({ name: "", body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(422);
  });

  it("accepts subject at exactly 500 characters", async () => {
    const response = await POST(
      postRequest({ name: "Test", subject: "s".repeat(500), body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(201);
  });

  it("rejects subject at 501 characters", async () => {
    const response = await POST(
      postRequest({ name: "Test", subject: "s".repeat(501), body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.details.subject).toBeDefined();
  });

  it("accepts body with minimal HTML tag", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<b>bold</b>" })
    );
    expect(response.status).toBe(201);
  });

  it("accepts body with self-closing HTML tag", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "Line 1<br/>Line 2" })
    );
    expect(response.status).toBe(201);
  });

  it("rejects body with plain text only", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "Just plain text, no tags at all" })
    );
    expect(response.status).toBe(422);
  });

  it("rejects body that is empty string", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "" })
    );
    expect(response.status).toBe(422);
  });

  it("accepts all valid categories", async () => {
    const categories = ["outreach", "deliverable", "payment", "renewal", "custom"];
    for (const cat of categories) {
      const response = await POST(
        postRequest({ name: `Template ${cat}`, body: `<p>${cat}</p>`, category: cat })
      );
      expect(response.status).toBe(201);
    }
  });

  it("rejects invalid category string", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>", category: "newsletter" })
    );
    expect(response.status).toBe(422);
  });

  it("accepts null category", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>", category: null })
    );
    expect(response.status).toBe(201);
  });

  it("accepts omitted optional fields (subject, category)", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.subject).toBeNull();
    expect(body.template.category).toBeNull();
  });

  it("rejects extra unknown fields", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>", isAdmin: true, priority: 1 })
    );
    expect(response.status).toBe(422);
  });

  it("rejects completely empty object", async () => {
    const response = await POST(postRequest({}));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(body.details.name).toBeDefined();
    expect(body.details.body).toBeDefined();
  });

  it("returns structured validation details with field-level errors", async () => {
    const response = await POST(
      postRequest({ name: "", body: "no html", category: "bogus" })
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details.name).toBeDefined();
    expect(body.details.body).toBeDefined();
    expect(body.details.category).toBeDefined();
  });
});

describe("POST /api/templates - malformed request body", () => {
  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: "{invalid json",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 for empty body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: "",
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/templates - successful creation passes correct data", () => {
  it("passes userId from session to createTemplate", async () => {
    await POST(postRequest({ name: "Test", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    );
  });

  it("passes isDefault as false", async () => {
    await POST(postRequest({ name: "Test", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: false })
    );
  });

  it("passes trimmed name", async () => {
    await POST(postRequest({ name: "  Spaced Name  ", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Spaced Name" })
    );
  });

  it("passes null for omitted subject", async () => {
    await POST(postRequest({ name: "Test", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ subject: null })
    );
  });

  it("passes provided subject string", async () => {
    await POST(
      postRequest({ name: "Test", subject: "My Subject", body: "<p>Hi</p>" })
    );
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "My Subject" })
    );
  });

  it("passes provided category", async () => {
    await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>", category: "outreach" })
    );
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ category: "outreach" })
    );
  });

  it("returns created template with 201 status", async () => {
    mockCreateTemplate.mockResolvedValue({
      id: "tmpl-new",
      userId: "user-1",
      name: "Test",
      subject: null,
      body: "<p>Hi</p>",
      category: null,
      isDefault: false,
    });

    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.id).toBe("tmpl-new");
    expect(body.template.name).toBe("Test");
  });

  it("returns 500 when createTemplate throws", async () => {
    mockCreateTemplate.mockRejectedValue(new Error("DB insert failed"));
    const response = await POST(
      postRequest({ name: "Test", body: "<p>Hi</p>" })
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create template");
  });
});

describe("PATCH /api/templates/[id] - validation boundaries", () => {
  it("accepts valid name update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { name: "Updated Name" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(200);
  });

  it("rejects empty name in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { name: "" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("rejects name exceeding 255 chars in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { name: "x".repeat(256) }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("rejects body without HTML in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { body: "plain text" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("accepts body with HTML in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { body: "<p>New body</p>" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(200);
  });

  it("rejects invalid category in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { category: "invalid" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("accepts null category in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { category: null }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(200);
  });

  it("rejects unknown fields in update", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { hack: "attempt" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("rejects empty update object (no fields)", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", {}),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("No fields to update");
  });

  it("returns 400 for malformed JSON in PATCH", async () => {
    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-1", {
        method: "PATCH",
        body: "not json{{{",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 404 when template not found for update", async () => {
    mockUpdateTemplate.mockResolvedValue(null);
    const response = await PATCH(
      patchRequest("tmpl-missing", { name: "Updated" }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Template not found");
  });

  it("returns 500 when updateTemplate throws", async () => {
    mockUpdateTemplate.mockRejectedValue(new Error("DB error"));
    const response = await PATCH(
      patchRequest("tmpl-1", { name: "Updated" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to update template");
  });

  it("accepts setting subject to null", async () => {
    const response = await PATCH(
      patchRequest("tmpl-1", { subject: null }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(200);
  });
});

describe("POST /api/templates - name trimming edge cases", () => {
  it("trims leading whitespace from name", async () => {
    await POST(postRequest({ name: "   Left Trimmed", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Left Trimmed" })
    );
  });

  it("trims trailing whitespace from name", async () => {
    await POST(postRequest({ name: "Right Trimmed   ", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Right Trimmed" })
    );
  });

  it("trims both sides of name", async () => {
    await POST(postRequest({ name: "  Both Sides  ", body: "<p>Hi</p>" }));
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Both Sides" })
    );
  });
});

describe("POST /api/templates - body HTML validation edge cases", () => {
  it("accepts body with div tags", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<div>Content</div>" })
    );
    expect(response.status).toBe(201);
  });

  it("accepts body with span tags", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<span>styled text</span>" })
    );
    expect(response.status).toBe(201);
  });

  it("accepts body with nested HTML tags", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "<div><p><strong>Bold</strong></p></div>" })
    );
    expect(response.status).toBe(201);
  });

  it("accepts body with HTML attributes", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: '<a href="https://example.com">Link</a>' })
    );
    expect(response.status).toBe(201);
  });

  it("accepts body where regex matches angle-bracket content as tag-like", async () => {
    const response = await POST(
      postRequest({ name: "Test", body: "1 < 2 and 3 > 1" })
    );
    expect(response.status).toBe(201);
  });
});
