import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as PreviewPost } from "@/app/api/templates/[id]/preview/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/templates", () => ({
  getTemplateById: vi.fn(),
  createTemplate: vi.fn(),
  getTemplatesByUserIdFiltered: vi.fn().mockResolvedValue([]),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getDefaultTemplates: vi.fn().mockResolvedValue([]),
  getTemplatesByUserId: vi.fn().mockResolvedValue([]),
}));

const mockPreviewTemplateEmail = vi.fn().mockReturnValue({
  html: "<html><body>Preview</body></html>",
  text: "Preview",
  subject: "Test Subject",
});

vi.mock("@/lib/email/emailService", () => ({
  previewTemplateEmail: (...args: unknown[]) => mockPreviewTemplateEmail(...args),
}));

const mockExtractVariablesFromTemplate = vi.fn().mockReturnValue([]);
const mockGetVariableInfo = vi.fn().mockReturnValue(undefined);
const mockGetDefaultVariableValues = vi.fn().mockReturnValue({});

vi.mock("@/lib/templates/templateEngine", () => ({
  extractVariablesFromTemplate: (...args: unknown[]) => mockExtractVariablesFromTemplate(...args),
  getVariableInfo: (...args: unknown[]) => mockGetVariableInfo(...args),
  getDefaultVariableValues: (...args: unknown[]) => mockGetDefaultVariableValues(...args),
  TEMPLATE_VARIABLES: [],
}));

import { getServerSession } from "next-auth";
import { getTemplateById } from "@/lib/db/queries/templates";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mockPreviewTemplateEmail.mockReturnValue({
    html: "<html><body>Preview</body></html>",
    text: "Preview",
    subject: "Test Subject",
  });
  mockExtractVariablesFromTemplate.mockReturnValue([]);
  mockGetVariableInfo.mockReturnValue(undefined);
  mockGetDefaultVariableValues.mockReturnValue({});
});

describe("POST /api/templates/[id]/preview - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /api/templates/[id]/preview - success cases", () => {
  it("returns rendered preview with html, text, and subject", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Welcome {{sponsor_name}}</p>",
      category: "outreach",
    });

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({ variables: { sponsor_name: "Acme Corp" } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preview).toBeDefined();
    expect(body.preview.html).toBeDefined();
    expect(body.preview.text).toBeDefined();
    expect(body.preview.subject).toBeDefined();
  });

  it("handles preview without request body", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello",
      body: "<p>Hello</p>",
    });

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("handles preview with empty variables object", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Subject",
      body: "<p>Body</p>",
    });

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({ variables: {} }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
  });
});

describe("POST /api/templates/[id]/preview - not found", () => {
  it("returns 404 when template does not exist", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/missing/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(response.status).toBe(404);
  });
});

describe("POST /api/templates/[id]/preview - variable resolution", () => {
  it("passes user-provided variables to preview renderer", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi {{sponsor_name}}",
      body: "<p>{{sponsor_name}}</p>",
      category: "outreach",
    });
    mockExtractVariablesFromTemplate.mockReturnValue(["sponsor_name"]);

    await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({ variables: { sponsor_name: "Custom Name" } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockPreviewTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ sponsor_name: "Custom Name" }),
      })
    );
  });

  it("extracts variables from subject and body", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "{{creator_name}} says hi",
      body: "<p>{{deal_amount}} for {{sponsor_name}}</p>",
    });

    await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockExtractVariablesFromTemplate).toHaveBeenCalledWith(
      "{{creator_name}} says hi",
      "<p>{{deal_amount}} for {{sponsor_name}}</p>"
    );
  });
});

describe("POST /api/templates/[id]/preview - edge cases", () => {
  it("handles template with null subject", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: null,
      body: "<p>Just body</p>",
    });

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("handles template with empty subject", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "",
      body: "<p>Body</p>",
    });

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
  });

  it("handles template with no variables in subject or body", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Static subject",
      body: "<p>Static body</p>",
    });
    mockExtractVariablesFromTemplate.mockReturnValue([]);

    const response = await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockPreviewTemplateEmail).toHaveBeenCalled();
  });

  it("handles template with UUID format id", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: uuid,
      subject: "Test",
      body: "<p>Test</p>",
    });

    const response = await PreviewPost(
      new Request(`http://localhost:3000/api/templates/${uuid}/preview`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: uuid }) }
    );

    expect(response.status).toBe(200);
  });
});
