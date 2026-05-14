import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/sponsors/[id]/send/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockGetSponsorById = vi.fn();
vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorById: (...args: unknown[]) => mockGetSponsorById(...args),
}));

const mockGetContactById = vi.fn();
vi.mock("@/lib/db/queries/contacts", () => ({
  getContactById: (...args: unknown[]) => mockGetContactById(...args),
}));

const mockGetTemplateById = vi.fn();
vi.mock("@/lib/db/queries/templates", () => ({
  getTemplateById: (...args: unknown[]) => mockGetTemplateById(...args),
}));

const mockSendTemplateEmail = vi.fn().mockResolvedValue({ id: "email-id-123" });
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
    sponsor_email: "acme@test.com",
  },
  missing: [],
});

vi.mock("@/lib/templates/variableResolver", () => ({
  resolveVariables: (...args: unknown[]) => mockResolveVariables(...args),
}));

const mockExtractVariablesFromTemplate = vi.fn().mockReturnValue([]);
vi.mock("@/lib/templates/templateEngine", () => ({
  extractVariablesFromTemplate: (...args: unknown[]) => mockExtractVariablesFromTemplate(...args),
}));

const mockCreateCommunication = vi.fn().mockResolvedValue({ id: "comm-1" });
vi.mock("@/lib/db/queries/communications", () => ({
  createCommunication: (...args: unknown[]) => mockCreateCommunication(...args),
}));

import { getServerSession } from "next-auth";

const SPONSOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const CONTACT_ID = "660e8400-e29b-41d4-a716-446655440001";
const TEMPLATE_ID = "770e8400-e29b-41d4-a716-446655440002";
const DEAL_ID = "880e8400-e29b-41d4-a716-446655440003";

const mockSponsor = {
  id: SPONSOR_ID,
  userId: "user-1",
  name: "Acme Corp",
  email: "acme@test.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContact = {
  id: CONTACT_ID,
  sponsorId: SPONSOR_ID,
  name: "Jane Doe",
  email: "jane@test.com",
  role: "Marketing",
  phone: null,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTemplate = {
  id: TEMPLATE_ID,
  userId: "user-1",
  name: "Sponsor Outreach",
  subject: "Hello {{sponsor_name}}",
  body: "<p>Hi {{sponsor_name}}</p>",
  category: "outreach",
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  mockGetSponsorById.mockResolvedValue(mockSponsor);
  mockGetContactById.mockResolvedValue(mockContact);
  mockGetTemplateById.mockResolvedValue(mockTemplate);
  mockSendTemplateEmail.mockResolvedValue({ id: "email-id-123" });
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
      sponsor_email: "acme@test.com",
    },
    missing: [],
  });
  mockExtractVariablesFromTemplate.mockReturnValue([]);
});

function makeSendRequest(overrides: Record<string, unknown> = {}) {
  return new Request(`http://localhost:3000/api/sponsors/${SPONSOR_ID}/send`, {
    method: "POST",
    body: JSON.stringify({ templateId: TEMPLATE_ID, contactId: CONTACT_ID, ...overrides }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/sponsors/[id]/send - edge cases", () => {
  it("returns 400 for invalid sponsor UUID", async () => {
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid sponsor id");
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await POST(
      new Request(`http://localhost:3000/api/sponsors/${SPONSOR_ID}/send`, {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for invalid templateId", async () => {
    const response = await POST(
      makeSendRequest({ templateId: "not-a-uuid", contactId: undefined }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("sends email to an array of recipients", async () => {
    const response = await POST(
      makeSendRequest({
        contactId: undefined,
        to: ["recipient1@test.com", "recipient2@test.com"],
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["recipient1@test.com", "recipient2@test.com"],
      })
    );
    expect(mockCreateCommunication).toHaveBeenCalledTimes(2);
  });

  it("passes cc and bcc to email service", async () => {
    await POST(
      makeSendRequest({
        cc: "cc@test.com",
        bcc: "bcc@test.com",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: "cc@test.com",
        bcc: "bcc@test.com",
      })
    );
  });

  it("passes replyTo to email service", async () => {
    await POST(
      makeSendRequest({
        replyTo: "reply@test.com",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "reply@test.com",
      })
    );
  });

  it("logs communication with cc/bcc as comma-separated strings", async () => {
    await POST(
      makeSendRequest({
        cc: ["cc1@test.com", "cc2@test.com"],
        bcc: ["bcc1@test.com", "bcc2@test.com"],
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        cc: "cc1@test.com,cc2@test.com",
        bcc: "bcc1@test.com,bcc2@test.com",
      })
    );
  });

  it("returns 422 when required variables are missing in non-preview mode", async () => {
    mockExtractVariablesFromTemplate.mockReturnValue(["sponsor_name", "missing_var"]);
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Missing required variables");
    expect(body.error).toContain("missing_var");
  });

  it("fills missing vars with placeholders in preview mode", async () => {
    mockExtractVariablesFromTemplate.mockReturnValue(["sponsor_name", "missing_var"]);
    const response = await POST(
      makeSendRequest({ preview: true }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockPreviewTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          missing_var: "[missing_var]",
        }),
      })
    );
  });

  it("uses resolved variables from variable context", async () => {
    await POST(makeSendRequest(), { params: Promise.resolve({ id: SPONSOR_ID }) });
    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sponsorId: SPONSOR_ID,
      })
    );
  });

  it("uses effectiveSponsorId from body when provided", async () => {
    const otherSponsorId = "990e8400-e29b-41d4-a716-446655440004";
    await POST(
      makeSendRequest({ sponsorId: otherSponsorId }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({ sponsorId: otherSponsorId })
    );
  });

  it("returns rate limit remaining on success", async () => {
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    const body = await response.json();
    expect(body.rateLimit.remaining).toBe(49);
  });

  it("logs failed communication with providerId null on send failure", async () => {
    mockSendTemplateEmail.mockRejectedValue(new Error("Service down"));
    await POST(makeSendRequest(), { params: Promise.resolve({ id: SPONSOR_ID }) });
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        providerId: null,
      })
    );
  });

  it("handles non-Error thrown values in catch block", async () => {
    mockSendTemplateEmail.mockRejectedValue("string error");
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to send email");
  });

  it("passes dealId to communication record", async () => {
    await POST(
      makeSendRequest({ dealId: DEAL_ID }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ dealId: DEAL_ID })
    );
  });

  it("passes deliverableId to variable context", async () => {
    const deliverableId = "aa0e8400-e29b-41d4-a716-446655440005";
    await POST(
      makeSendRequest({ deliverableId }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({ deliverableId })
    );
  });

  it("user variable overrides take precedence", async () => {
    mockExtractVariablesFromTemplate.mockReturnValue(["sponsor_name"]);
    await POST(
      makeSendRequest({ variables: { sponsor_name: "Custom Sponsor" } }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ sponsor_name: "Custom Sponsor" }),
      })
    );
  });
});
