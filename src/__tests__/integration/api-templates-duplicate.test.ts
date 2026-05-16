import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/templates/[id]/duplicate/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockGetTemplateById = vi.fn();
const mockCreateTemplate = vi.fn();

vi.mock("@/lib/db/queries/templates", () => ({
  getTemplateById: (...args: unknown[]) => mockGetTemplateById(...args),
  createTemplate: (...args: unknown[]) => mockCreateTemplate(...args),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

const sourceTemplate = {
  id: "tmpl-1",
  userId: "user-1",
  name: "Welcome Email",
  subject: "Hello {{sponsor_name}}",
  body: "<p>Welcome to SponsorSync!</p>",
  category: "outreach",
  isDefault: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("POST /api/templates/[id]/duplicate - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /api/templates/[id]/duplicate - success cases", () => {
  it("duplicates template with default name (Copy suffix)", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("Welcome Email (Copy)");
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Welcome Email (Copy)",
        subject: sourceTemplate.subject,
        body: sourceTemplate.body,
        category: sourceTemplate.category,
        isDefault: false,
      })
    );
  });

  it("duplicates template with custom name", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({ name: "My Custom Copy" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("My Custom Copy");
  });

  it("duplicates template with no body (empty JSON)", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("Welcome Email (Copy)");
  });

  it("preserves subject, body, and category from source", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: sourceTemplate.subject,
        body: sourceTemplate.body,
        category: sourceTemplate.category,
      })
    );
  });

  it("sets isDefault to false on duplicated template", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate, isDefault: true });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: false })
    );
  });

  it("uses authenticated user id for duplicated template", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    );
  });
});

describe("POST /api/templates/[id]/duplicate - not found", () => {
  it("returns 404 when source template does not exist", async () => {
    mockGetTemplateById.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-missing/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Template not found");
  });

  it("does not create template when source not found", async () => {
    mockGetTemplateById.mockResolvedValue(null);

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-missing/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );

    expect(mockCreateTemplate).not.toHaveBeenCalled();
  });
});

describe("POST /api/templates/[id]/duplicate - validation", () => {
  it("returns 422 when name is empty string", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 when name exceeds 255 characters", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({ name: "a".repeat(256) }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
  });

  it("trims whitespace from custom name", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockImplementation((data: any) => Promise.resolve({ id: "tmpl-2", ...data }));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({ name: "  Trimmed Name  " }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.template.name).toBe("Trimmed Name");
  });
});

describe("POST /api/templates/[id]/duplicate - server errors", () => {
  it("returns 500 when database lookup fails", async () => {
    mockGetTemplateById.mockRejectedValue(new Error("Database connection failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to duplicate template");
  });

  it("returns 500 when template creation fails", async () => {
    mockGetTemplateById.mockResolvedValue({ ...sourceTemplate });
    mockCreateTemplate.mockRejectedValue(new Error("Insert failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/duplicate", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to duplicate template");
  });
});
