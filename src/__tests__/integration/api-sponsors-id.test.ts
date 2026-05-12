import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GET as GetById,
  PATCH,
  DELETE,
} from "@/app/api/sponsors/[id]/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/sponsors", () => ({
  getSponsorById: vi.fn(),
  updateSponsor: vi.fn(),
  deleteSponsor: vi.fn(),
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealsBySponsorId: vi.fn(),
}));

vi.mock("@/domain/deals", () => ({
  calculateDealProgress: vi.fn(() => 50),
}));

import { getServerSession } from "next-auth";
import {
  getSponsorById,
  updateSponsor,
  deleteSponsor,
} from "@/lib/db/queries/sponsors";
import { getDealsBySponsorId } from "@/lib/db/queries/deals";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const sampleSponsor = {
  id: UUID,
  userId: "user-1",
  name: "Acme Corp",
  company: "Acme Inc",
  email: "contact@acme.com",
  phone: "+1234567890",
  notes: "Premium sponsor",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const sampleDeal = {
  id: "deal-1",
  userId: "user-1",
  sponsorId: UUID,
  title: "Q2 Package",
  description: null,
  status: "active" as const,
  totalValue: 12000,
  currency: "USD",
  startDate: null,
  endDate: null,
  contractUrl: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("GET /api/sponsors/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GetById(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/sponsors/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns sponsor with deals scoped to user", async () => {
    (getSponsorById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleSponsor);
    (getDealsBySponsorId as ReturnType<typeof vi.fn>).mockResolvedValue([sampleDeal]);

    const response = await GetById(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsor.name).toBe("Acme Corp");
    expect(body.sponsor.id).toBe(UUID);
    expect(body.deals).toHaveLength(1);
    expect(body.deals[0].title).toBe("Q2 Package");
    expect(getSponsorById).toHaveBeenCalledWith(UUID, "user-1");
    expect(getDealsBySponsorId).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns sponsor with empty deals array", async () => {
    (getSponsorById as ReturnType<typeof vi.fn>).mockResolvedValue(sampleSponsor);
    (getDealsBySponsorId as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await GetById(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deals).toEqual([]);
  });

  it("returns 404 when sponsor not found", async () => {
    (getSponsorById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await GetById(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Sponsor not found");
  });

  it("returns 400 for empty string id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/sponsors/"),
      { params: Promise.resolve({ id: "" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for numeric id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/sponsors/123"),
      { params: Promise.resolve({ id: "123" }) }
    );
    expect(response.status).toBe(400);
  });

  it("includes validation details on bad id", async () => {
    const response = await GetById(
      new Request("http://localhost:3000/api/sponsors/abc"),
      { params: Promise.resolve({ id: "abc" }) }
    );
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});

describe("PATCH /api/sponsors/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Corp" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const request = new Request(
      "http://localhost:3000/api/sponsors/not-a-uuid",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Corp" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid body data", async () => {
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 when name is too long", async () => {
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "x".repeat(256) }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ email: "not-an-email" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
  });

  it("updates sponsor scoped to user", async () => {
    const updateData = { name: "Updated Corp" };
    (updateSponsor as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      ...updateData,
    });
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify(updateData),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sponsor).toEqual({ id: UUID, ...updateData });
    expect(updateSponsor).toHaveBeenCalledWith(UUID, updateData, "user-1");
  });

  it("returns 404 when updating nonexistent sponsor", async () => {
    (updateSponsor as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Test" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Sponsor not found");
  });

  it("accepts valid partial update with empty body", async () => {
    (updateSponsor as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      name: "Existing",
    });
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(200);
  });

  it("returns validation details on bad body", async () => {
    const request = new Request(
      `http://localhost:3000/api/sponsors/${UUID}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    const body = await response.json();
    expect(body.details).toBeDefined();
  });
});

describe("DELETE /api/sponsors/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await DELETE(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const response = await DELETE(
      new Request("http://localhost:3000/api/sponsors/not-a-uuid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns deleted true scoped to user", async () => {
    (deleteSponsor as ReturnType<typeof vi.fn>).mockResolvedValue({ id: UUID });
    const response = await DELETE(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deleted).toBe(true);
    expect(deleteSponsor).toHaveBeenCalledWith(UUID, "user-1");
  });

  it("returns 404 when deleting nonexistent sponsor", async () => {
    (deleteSponsor as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const response = await DELETE(
      new Request(`http://localhost:3000/api/sponsors/${UUID}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: UUID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Sponsor not found");
  });

  it("calls deleteSponsor with correct id and userId", async () => {
    const sponsorId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    (deleteSponsor as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: sponsorId,
    });
    await DELETE(
      new Request(`http://localhost:3000/api/sponsors/${sponsorId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: sponsorId }) }
    );
    expect(deleteSponsor).toHaveBeenCalledWith(sponsorId, "user-1");
  });
});
