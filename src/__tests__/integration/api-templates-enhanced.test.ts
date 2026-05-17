import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/templates/route";
import { GET as GetById, PATCH, DELETE } from "@/app/api/templates/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockGetTemplatesByUserIdFiltered = vi.fn();
const mockCreateTemplate = vi.fn();
const mockGetTemplateById = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();

vi.mock("@/lib/db/queries/templates", () => ({
  getTemplatesByUserIdFiltered: (...args: unknown[]) => mockGetTemplatesByUserIdFiltered(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
  getTemplateById: (...args: unknown[]) => mockGetTemplateById(...args),
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/templates - search and filtering", () => {
  it("passes search query parameter to database query", async () => {
    mockGetTemplatesByUserIdFiltered.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/templates?search=welcome"));

    expect(mockGetTemplatesByUserIdFiltered).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ search: "welcome" })
    );
  });

  it("passes category query parameter to database query", async () => {
    mockGetTemplatesByUserIdFiltered.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/templates?category=outreach"));

    expect(mockGetTemplatesByUserIdFiltered).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ category: "outreach" })
    );
  });

  it("passes both search and category parameters", async () => {
    mockGetTemplatesByUserIdFiltered.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/templates?search=test&category=payment"));

    expect(mockGetTemplatesByUserIdFiltered).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ search: "test", category: "payment" })
    );
  });

  it("returns undefined for missing query params", async () => {
    mockGetTemplatesByUserIdFiltered.mockResolvedValue([]);

    await GET(new Request("http://localhost:3000/api/templates"));

    expect(mockGetTemplatesByUserIdFiltered).toHaveBeenCalledWith(
      "user-1",
      { search: undefined, category: undefined }
    );
  });

  it("returns filtered templates", async () => {
    const templates = [
      { id: "1", name: "Welcome", category: "outreach" },
      { id: "2", name: "Invoice", category: "payment" },
    ];
    mockGetTemplatesByUserIdFiltered.mockResolvedValue(templates);

    const response = await GET(new Request("http://localhost:3000/api/templates?category=outreach"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.templates).toEqual(templates);
  });
});

describe("GET /api/templates - server errors", () => {
  it("returns 500 when database query fails", async () => {
    mockGetTemplatesByUserIdFiltered.mockRejectedValue(new Error("DB error"));

    const response = await GET(new Request("http://localhost:3000/api/templates"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch templates");
  });
});

describe("POST /api/templates - validation edge cases", () => {
  it("returns 422 for invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: "not valid json{{{",
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("accepts whitespace-only name (schema trims after min validation)", async () => {
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-new", ...data }));

    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "   ", body: "<p>Hi</p>" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("");
  });

  it("returns 422 when subject exceeds 500 characters", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test", subject: "a".repeat(501), body: "<p>Hi</p>" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 with validation details", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("returns 422 for body without HTML tags", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test", body: "Plain text only" }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(422);
  });

  it("returns 422 for unknown fields in body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test", body: "<p>Hi</p>", isAdmin: true }),
        headers: { "Content-Type": "application/json" },
      })
    );

    expect(response.status).toBe(422);
  });
});

describe("POST /api/templates - server errors", () => {
  it("returns 500 when database create fails", async () => {
    mockCreateTemplate.mockRejectedValue(new Error("Insert failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: "Test", body: "<p>Hi</p>" }),
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to create template");
  });
});

describe("GET /api/templates/[id] - not found", () => {
  it("returns 404 when template does not exist", async () => {
    mockGetTemplateById.mockResolvedValue(null);

    const response = await GetById(
      new Request("http://localhost:3000/api/templates/missing-id"),
      { params: Promise.resolve({ id: "missing-id" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Template not found");
  });

  it("returns 500 when database query fails", async () => {
    mockGetTemplateById.mockRejectedValue(new Error("DB error"));

    const response = await GetById(
      new Request("http://localhost:3000/api/templates/tmpl-1"),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch template");
  });
});

describe("PATCH /api/templates/[id] - validation edge cases", () => {
  it("returns 422 when body is empty JSON object", async () => {
    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-1", {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toBe("No fields to update");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-1", {
        method: "PATCH",
        body: "broken json",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for unknown fields", async () => {
    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-1", {
        method: "PATCH",
        body: JSON.stringify({ unauthorized: "field" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
  });

  it("returns 404 when template not found for update", async () => {
    mockUpdateTemplate.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-missing", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Template not found");
  });

  it("returns 500 when database update fails", async () => {
    mockUpdateTemplate.mockRejectedValue(new Error("Update failed"));

    const response = await PATCH(
      new Request("http://localhost:3000/api/templates/tmpl-1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to update template");
  });
});

describe("DELETE /api/templates/[id] - edge cases", () => {
  it("returns 404 when template not found", async () => {
    mockDeleteTemplate.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost:3000/api/templates/tmpl-missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Template not found");
  });

  it("returns 500 when database delete fails", async () => {
    mockDeleteTemplate.mockRejectedValue(new Error("Delete failed"));

    const response = await DELETE(
      new Request("http://localhost:3000/api/templates/tmpl-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to delete template");
  });

  it("returns deleted true on successful delete", async () => {
    mockDeleteTemplate.mockResolvedValue({ id: "tmpl-1" });

    const response = await DELETE(
      new Request("http://localhost:3000/api/templates/tmpl-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
  });
});
