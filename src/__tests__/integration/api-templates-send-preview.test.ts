import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as SendPost } from "@/app/api/templates/[id]/send/route";
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

const mockSendTemplateEmail = vi.fn().mockResolvedValue({ id: "sent-email-id" });
const mockPreviewTemplateEmail = vi.fn().mockReturnValue({
  html: "<html><body>Preview</body></html>",
  text: "Preview",
  subject: "Test Subject",
});
const mockCheckRateLimit = vi.fn().mockReturnValue({ allowed: true, remaining: 49 });

vi.mock("@/lib/email/emailService", () => ({
  sendTemplateEmail: (...args: unknown[]) => mockSendTemplateEmail(...args),
  previewTemplateEmail: (...args: unknown[]) => mockPreviewTemplateEmail(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockResolveVariables = vi.fn().mockResolvedValue({
  variables: {
    creator_name: "John",
    creator_show: "My Show",
    sponsor_name: "Acme",
    sponsor_company: "Acme Inc",
    deal_title: "Big Deal",
    deal_amount: "$500",
    deliverable_title: "Ad Read",
    due_date: "2025-03-15",
  },
  missing: [],
});

vi.mock("@/lib/templates/variableResolver", () => ({
  resolveVariables: (...args: unknown[]) => mockResolveVariables(...args),
}));

const mockCreateCommunication = vi.fn().mockResolvedValue({ id: "comm-1" });
vi.mock("@/lib/db/queries/communications", () => ({
  createCommunication: (...args: unknown[]) => mockCreateCommunication(...args),
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
  mockSendTemplateEmail.mockResolvedValue({ id: "sent-email-id" });
  mockPreviewTemplateEmail.mockReturnValue({
    html: "<html><body>Preview</body></html>",
    text: "Preview",
    subject: "Test Subject",
  });
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 49 });
  mockResolveVariables.mockResolvedValue({
    variables: {
      creator_name: "John",
      creator_show: "My Show",
      sponsor_name: "Acme",
      sponsor_company: "Acme Inc",
      deal_title: "Big Deal",
      deal_amount: "$500",
      deliverable_title: "Ad Read",
      due_date: "2025-03-15",
    },
    missing: [],
  });
});

describe("POST /api/templates/[id]/send - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /api/templates/[id]/send", () => {
  it("sends email with user-provided variables", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Dear {{sponsor_name}},</p>",
      category: "outreach",
      isDefault: true,
    });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@test.com",
          variables: { sponsor_name: "Acme Corp" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("sent-email-id");
    expect(body.rateLimit.remaining).toBe(49);
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sponsor@test.com",
        variables: expect.objectContaining({ sponsor_name: "Acme Corp" }),
      })
    );
  });

  it("resolves variables from DB context when sponsorId/dealId provided", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Deal: {{deal_title}}</p>",
      category: "outreach",
    });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@test.com",
          sponsorId: "s-1",
          dealId: "d-1",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sponsorId: "s-1",
        dealId: "d-1",
      })
    );
  });

  it("user variables override DB-resolved variables", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi {{sponsor_name}}",
      body: "<p>{{sponsor_name}}</p>",
      category: "outreach",
    });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@test.com",
          sponsorId: "s-1",
          variables: { sponsor_name: "Custom Override" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ sponsor_name: "Custom Override" }),
      })
    );
  });

  it("returns 422 when missing recipient", async () => {
    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ variables: { sponsor_name: "Test" } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 when missing required template variables", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Deal: {{deal_title}}</p>",
      category: "outreach",
    });
    mockResolveVariables.mockResolvedValue({
      variables: {},
      missing: ["sponsor_name", "deal_title"],
    });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Missing required variables");
  });

  it("returns 404 when template not found", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/missing/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com", variables: { sponsor_name: "Test" } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain("Rate limit");
  });

  it("handles email service errors gracefully", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi {{name}}",
      body: "<p>{{name}}</p>",
    });
    mockSendTemplateEmail.mockRejectedValue(new Error("Email service unavailable"));

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@test.com", variables: { name: "Test" } }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Email service unavailable");
  });

  it("sends to multiple recipients", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi {{sponsor_name}}",
      body: "<p>{{sponsor_name}}</p>",
    });

    const response = await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: ["one@test.com", "two@test.com"],
          variables: { sponsor_name: "Acme" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["one@test.com", "two@test.com"],
      })
    );
  });

  it("passes cc, bcc, and replyTo through to email service", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi {{sponsor_name}}",
      body: "<p>{{sponsor_name}}</p>",
    });

    await SendPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@test.com",
          cc: "cc@test.com",
          bcc: "bcc@test.com",
          replyTo: "reply@test.com",
          variables: { sponsor_name: "Acme" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: "cc@test.com",
        bcc: "bcc@test.com",
        replyTo: "reply@test.com",
      })
    );
  });
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
});

describe("POST /api/templates/[id]/preview", () => {
  it("returns rendered preview with sample data", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>Welcome {{sponsor_name}} from {{creator_show}}</p>",
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

  it("uses variable labels as fallback when no value provided", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hello {{sponsor_name}}",
      body: "<p>{{deal_amount}}</p>",
    });

    await PreviewPost(
      new Request("http://localhost:3000/api/templates/tmpl-1/preview", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockPreviewTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sponsor_name: "Sponsor Name",
          deal_amount: "Deal Amount",
        }),
      })
    );
  });

  it("returns 404 when template not found", async () => {
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

  it("handles missing body gracefully", async () => {
    (getTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tmpl-1",
      subject: "Hi",
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
});
