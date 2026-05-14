import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as CommunicationsGet } from "@/app/api/communications/route";
import { GET as SponsorCommunicationsGet } from "@/app/api/sponsors/[id]/communications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

const mockGetCommunicationsByUserId = vi.fn().mockResolvedValue([]);
vi.mock("@/lib/db/queries/communications", () => ({
  getCommunicationsByUserId: (...args: unknown[]) => mockGetCommunicationsByUserId(...args),
}));

const mockGetSponsorById = vi.fn();
vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorById: (...args: unknown[]) => mockGetSponsorById(...args),
}));

import { getServerSession } from "next-auth";

const SPONSOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const CONTACT_ID = "660e8400-e29b-41d4-a716-446655440001";
const TEMPLATE_ID = "770e8400-e29b-41d4-a716-446655440002";

const mockCommunication = {
  id: "comm-1",
  userId: "user-1",
  sponsorId: SPONSOR_ID,
  sponsorContactId: CONTACT_ID,
  templateId: TEMPLATE_ID,
  dealId: null,
  subject: "Hello Sponsor",
  body: "<p>Hi {{sponsor_name}}</p>",
  status: "sent" as const,
  providerId: "email-id-123",
  to: "jane@test.com",
  cc: null,
  bcc: null,
  sentAt: new Date("2025-03-15"),
  createdAt: new Date("2025-03-15"),
};

const mockSponsor = {
  id: SPONSOR_ID,
  userId: "user-1",
  name: "Acme Corp",
  company: "Acme Inc",
  email: "acme@test.com",
  phone: null,
  notes: null,
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
  mockGetCommunicationsByUserId.mockResolvedValue([mockCommunication]);
  mockGetSponsorById.mockResolvedValue(mockSponsor);
});

describe("GET /api/communications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications")
    );
    expect(response.status).toBe(401);
  });

  it("returns all communications for user", async () => {
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.communications).toHaveLength(1);
    expect(body.communications[0].subject).toBe("Hello Sponsor");
  });

  it("filters by sponsorId", async () => {
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications?sponsorId=" + SPONSOR_ID)
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ sponsorId: SPONSOR_ID })
    );
  });

  it("supports limit and offset", async () => {
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications?limit=10&offset=5")
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ limit: 10, offset: 5 })
    );
  });
});

describe("GET /api/sponsors/[id]/communications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/sponsor-1/communications"),
      { params: Promise.resolve({ id: "sponsor-1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/communications"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns communications for a sponsor", async () => {
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/communications"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.communications).toHaveLength(1);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ sponsorId: SPONSOR_ID })
    );
  });
});
