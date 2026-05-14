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
});

function makeSendRequest(overrides: Record<string, unknown> = {}) {
  return new Request(`http://localhost:3000/api/sponsors/${SPONSOR_ID}/send`, {
    method: "POST",
    body: JSON.stringify({ templateId: TEMPLATE_ID, contactId: CONTACT_ID, ...overrides }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/sponsors/[id]/send - auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(401);
  });
});

describe("POST /api/sponsors/[id]/send", () => {
  it("sends email to a contact and logs communication", async () => {
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe("email-id-123");

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jane@test.com",
        subject: "Hello {{sponsor_name}}",
      })
    );

    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sponsorId: SPONSOR_ID,
        sponsorContactId: CONTACT_ID,
        templateId: TEMPLATE_ID,
        status: "sent",
        providerId: "email-id-123",
        to: "jane@test.com",
      })
    );
  });

  it("sends email to custom address when no contactId", async () => {
    const response = await POST(
      makeSendRequest({ contactId: undefined, to: "custom@test.com" }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );

    expect(response.status).toBe(200);
    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "custom@test.com" })
    );
  });

  it("returns 422 when neither contactId nor to provided", async () => {
    const response = await POST(
      makeSendRequest({ contactId: undefined }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when contact not found", async () => {
    mockGetContactById.mockResolvedValue(null);
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when template not found", async () => {
    mockGetTemplateById.mockResolvedValue(null);
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });
    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });
    expect(response.status).toBe(429);
  });

  it("returns preview when preview is true", async () => {
    const response = await POST(
      makeSendRequest({ preview: true }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );

    expect(response.status).toBe(200);
    expect(mockPreviewTemplateEmail).toHaveBeenCalled();
    expect(mockSendTemplateEmail).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.preview).toBeDefined();
    expect(body.preview.html).toBeDefined();
  });

  it("logs failed communication when email send fails", async () => {
    mockSendTemplateEmail.mockRejectedValue(new Error("Service down"));

    const response = await POST(makeSendRequest(), {
      params: Promise.resolve({ id: SPONSOR_ID }),
    });

    expect(response.status).toBe(500);
    expect(mockCreateCommunication).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
  });

  it("resolves variables from sponsor context", async () => {
    await POST(
      makeSendRequest({ dealId: DEAL_ID }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );

    expect(mockResolveVariables).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sponsorId: SPONSOR_ID,
        dealId: DEAL_ID,
      })
    );
  });

  it("allows user variable overrides", async () => {
    await POST(
      makeSendRequest({ variables: { sponsor_name: "Custom Name" } }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({ sponsor_name: "Custom Name" }),
      })
    );
  });
});
