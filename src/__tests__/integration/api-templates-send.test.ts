import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/templates/[id]/send/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockGetTemplateById = vi.fn();
vi.mock("@/lib/db/queries/templates", () => ({
  getTemplateById: (...args: unknown[]) => mockGetTemplateById(...args),
}));

const mockSendTemplateEmail = vi.fn();
const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/email/emailService", () => ({
  sendTemplateEmail: (...args: unknown[]) => mockSendTemplateEmail(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

const mockResolveVariables = vi.fn();
vi.mock("@/lib/templates/variableResolver", () => ({
  resolveVariables: (...args: unknown[]) => mockResolveVariables(...args),
}));

const mockCreateCommunication = vi.fn();
vi.mock("@/lib/db/queries/communications", () => ({
  createCommunication: (...args: unknown[]) => mockCreateCommunication(...args),
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

const mockTemplate = {
  id: "tmpl-1",
  userId: "user-1",
  name: "Outreach Email",
  subject: "Hello {{sponsor_name}}",
  body: "<p>Hi {{sponsor_name}}, from {{creator_name}}!</p>",
  category: "outreach",
  isDefault: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 49 });
  mockResolveVariables.mockResolvedValue({
    variables: { sponsor_name: "Acme Corp", creator_name: "John" },
    missing: [],
  });
  mockSendTemplateEmail.mockResolvedValue({ id: "email-1" });
  mockCreateCommunication.mockResolvedValue({ id: "comm-1" });
});

describe("POST /api/templates/[id]/send - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has empty user id", async () => {
    mockAuth({ user: { id: "  " } } as any);
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(401);
  });
});

describe("POST /api/templates/[id]/send - validation", () => {
  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 when to field is missing", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Validation failed");
  });

  it("returns 422 when to field is invalid email", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "not-an-email" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });

  it("returns 422 when to field is empty array", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: [] }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(422);
  });
});

describe("POST /api/templates/[id]/send - rate limiting", () => {
  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toContain("Rate limit exceeded");
  });

  it("checks rate limit with user id", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/templates/[id]/send - success cases", () => {
  it("sends email to single recipient and returns result", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@acme.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("email-1");
    expect(body.rateLimit.remaining).toBe(49);
  });

  it("resolves variables from context", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@acme.com",
          sponsorId: "550e8400-e29b-41d4-a716-446655440000",
          dealId: "550e8400-e29b-41d4-a716-446655440001",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sponsorId: "550e8400-e29b-41d4-a716-446655440000",
        dealId: "550e8400-e29b-41d4-a716-446655440001",
      })
    );
  });

  it("calls sendTemplateEmail with correct parameters", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@acme.com",
          cc: "cc@acme.com",
          bcc: "bcc@acme.com",
          replyTo: "reply@test.com",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sponsor@acme.com",
        cc: "cc@acme.com",
        bcc: "bcc@acme.com",
        replyTo: "reply@test.com",
        variables: expect.objectContaining({
          sponsor_name: "Acme Corp",
          creator_name: "John",
        }),
      })
    );
  });

  it("creates communication record for single recipient", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "sponsor@acme.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledTimes(1);
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        templateId: "tmpl-1",
        status: "sent",
        to: "sponsor@acme.com",
      })
    );
  });

  it("creates communication records for each array recipient", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: ["one@test.com", "two@test.com", "three@test.com"] }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledTimes(3);
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ to: "one@test.com" })
    );
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ to: "two@test.com" })
    );
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ to: "three@test.com" })
    );
  });

  it("merges resolved variables with provided overrides", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "sponsor@acme.com",
          variables: { custom_var: "custom_value" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          sponsor_name: "Acme Corp",
          creator_name: "John",
          custom_var: "custom_value",
        }),
      })
    );
  });
});

describe("POST /api/templates/[id]/send - template not found", () => {
  it("returns 404 when template does not exist", async () => {
    mockGetTemplateById.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-missing/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Template not found");
  });

  it("does not send email when template not found", async () => {
    mockGetTemplateById.mockResolvedValue(null);

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-missing/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-missing" }) }
    );

    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/templates/[id]/send - missing variables", () => {
  it("returns 422 when required variables are missing", async () => {
    mockGetTemplateById.mockResolvedValue({
      ...mockTemplate,
      body: "<p>{{sponsor_name}} and {{missing_var}}</p>",
    });
    mockResolveVariables.mockResolvedValue({
      variables: { sponsor_name: "Acme" },
      missing: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("missing_var");
  });

  it("succeeds when all required variables are provided", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(200);
  });
});

describe("POST /api/templates/[id]/send - server errors", () => {
  it("returns 500 when email service fails", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });
    mockSendTemplateEmail.mockRejectedValue(new Error("SMTP connection failed"));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("SMTP connection failed");
  });

  it("returns 500 with generic message for non-Error throws", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });
    mockSendTemplateEmail.mockRejectedValue("string error");

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to send email");
  });

  it("returns 500 when variable resolution fails", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });
    mockResolveVariables.mockRejectedValue(new Error("Database error"));

    const response = await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Database error");
  });
});

describe("POST /api/templates/[id]/send - communication logging", () => {
  it("logs cc as comma-separated string from array", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          cc: ["cc1@test.com", "cc2@test.com"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: "cc1@test.com,cc2@test.com",
      })
    );
  });

  it("logs bcc as comma-separated string from array", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          bcc: ["bcc1@test.com", "bcc2@test.com"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        bcc: "bcc1@test.com,bcc2@test.com",
      })
    );
  });

  it("logs cc as string when provided as string", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          cc: "cc@test.com",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ cc: "cc@test.com" })
    );
  });

  it("logs null cc and bcc when not provided", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ cc: null, bcc: null })
    );
  });

  it("logs sponsorId when provided", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({
          to: "test@example.com",
          sponsorId: "550e8400-e29b-41d4-a716-446655440000",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        sponsorId: "550e8400-e29b-41d4-a716-446655440000",
      })
    );
  });

  it("logs null sponsorId when not provided", async () => {
    mockGetTemplateById.mockResolvedValue({ ...mockTemplate });

    await POST(
      new Request("http://localhost:3000/api/templates/tmpl-1/send", {
        method: "POST",
        body: JSON.stringify({ to: "test@example.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "tmpl-1" }) }
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ sponsorId: null })
    );
  });
});
