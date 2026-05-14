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

const mockCommunication = {
  id: "comm-1",
  userId: "user-1",
  sponsorId: SPONSOR_ID,
  sponsorContactId: "contact-1",
  templateId: "tmpl-1",
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
  email: "acme@test.com",
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

describe("GET /api/communications - edge cases", () => {
  it("returns empty array when no communications exist", async () => {
    mockGetCommunicationsByUserId.mockResolvedValue([]);
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications")
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.communications).toHaveLength(0);
  });

  it("ignores non-numeric limit parameter", async () => {
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications?limit=abc")
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ limit: undefined })
    );
  });

  it("ignores non-numeric offset parameter", async () => {
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications?offset=xyz")
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ offset: undefined })
    );
  });

  it("passes both sponsorId and pagination params together", async () => {
    const response = await CommunicationsGet(
      new Request(
        `http://localhost:3000/api/communications?sponsorId=${SPONSOR_ID}&limit=5&offset=10`
      )
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith("user-1", {
      sponsorId: SPONSOR_ID,
      limit: 5,
      offset: 10,
    });
  });

  it("returns 500 when database throws", async () => {
    mockGetCommunicationsByUserId.mockRejectedValue(new Error("DB error"));
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications")
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch communications");
  });

  it("returns multiple communications", async () => {
    mockGetCommunicationsByUserId.mockResolvedValue([
      mockCommunication,
      { ...mockCommunication, id: "comm-2", subject: "Second Email" },
      { ...mockCommunication, id: "comm-3", subject: "Third Email" },
    ]);
    const response = await CommunicationsGet(
      new Request("http://localhost:3000/api/communications")
    );
    const body = await response.json();
    expect(body.communications).toHaveLength(3);
  });
});

describe("GET /api/sponsors/[id]/communications - edge cases", () => {
  it("returns 400 for invalid UUID", async () => {
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/not-a-uuid/communications"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns empty array when sponsor has no communications", async () => {
    mockGetCommunicationsByUserId.mockResolvedValue([]);
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/communications"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.communications).toHaveLength(0);
  });

  it("passes limit and offset query parameters", async () => {
    const response = await SponsorCommunicationsGet(
      new Request(
        `http://localhost:3000/api/sponsors/${SPONSOR_ID}/communications?limit=20&offset=5`
      ),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ limit: 20, offset: 5 })
    );
  });

  it("ignores NaN limit values", async () => {
    const response = await SponsorCommunicationsGet(
      new Request(
        `http://localhost:3000/api/sponsors/${SPONSOR_ID}/communications?limit=abc`
      ),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockGetCommunicationsByUserId).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ limit: undefined })
    );
  });

  it("returns 500 when database throws", async () => {
    mockGetCommunicationsByUserId.mockRejectedValue(new Error("DB error"));
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/communications"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch communications");
  });

  it("does not call communications query when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await SponsorCommunicationsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/communications"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(404);
    expect(mockGetCommunicationsByUserId).not.toHaveBeenCalled();
  });
});
