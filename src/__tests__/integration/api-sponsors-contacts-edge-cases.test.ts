import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as ContactsPost, GET as ContactsGet } from "@/app/api/sponsors/[id]/contacts/route";
import { PATCH as ContactPatch, DELETE as ContactDelete } from "@/app/api/sponsors/[id]/contacts/[contactId]/route";

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

const mockGetContactsBySponsorId = vi.fn().mockResolvedValue([]);
const mockCreateContact = vi.fn();
const mockGetContactById = vi.fn();
const mockUpdateContact = vi.fn();
const mockDeleteContact = vi.fn();
const mockClearPrimaryFlag = vi.fn();

vi.mock("@/lib/db/queries/contacts", () => ({
  getContactsBySponsorId: (...args: unknown[]) => mockGetContactsBySponsorId(...args),
  createContact: (...args: unknown[]) => mockCreateContact(...args),
  getContactById: (...args: unknown[]) => mockGetContactById(...args),
  updateContact: (...args: unknown[]) => mockUpdateContact(...args),
  deleteContact: (...args: unknown[]) => mockDeleteContact(...args),
  clearPrimaryFlag: (...args: unknown[]) => mockClearPrimaryFlag(...args),
}));

import { getServerSession } from "next-auth";

const SPONSOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const CONTACT_ID = "660e8400-e29b-41d4-a716-446655440001";

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
  role: "Marketing Director",
  phone: "+1234567890",
  isPrimary: true,
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
  mockGetContactsBySponsorId.mockResolvedValue([mockContact]);
  mockCreateContact.mockResolvedValue(mockContact);
  mockGetContactById.mockResolvedValue(mockContact);
  mockUpdateContact.mockResolvedValue(mockContact);
  mockDeleteContact.mockResolvedValue(mockContact);
});

describe("GET /api/sponsors/[id]/contacts - edge cases", () => {
  it("returns 400 for invalid UUID", async () => {
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/not-a-uuid/contacts"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns 500 when database throws", async () => {
    mockGetContactsBySponsorId.mockRejectedValue(new Error("DB error"));
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch contacts");
  });

  it("returns empty array when no contacts exist", async () => {
    mockGetContactsBySponsorId.mockResolvedValue([]);
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contacts).toHaveLength(0);
  });
});

describe("POST /api/sponsors/[id]/contacts - edge cases", () => {
  it("returns 400 for invalid UUID", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/invalid/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "invalid" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
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

  it("returns 422 for empty body object", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("accepts whitespace-only name (Zod min(1) does not trim)", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "   ", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(201);
  });

  it("returns 422 for email without domain", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("returns 500 when database throws on create", async () => {
    mockCreateContact.mockRejectedValue(new Error("DB error"));
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to create contact");
  });

  it("creates contact with minimal valid data", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(201);
    expect(mockCreateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        sponsorId: SPONSOR_ID,
        name: "Jane",
        email: "jane@test.com",
        role: null,
        phone: null,
        isPrimary: false,
      })
    );
  });

  it("clears primary flag before creating primary contact", async () => {
    await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com", isPrimary: true }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockClearPrimaryFlag).toHaveBeenCalledWith(SPONSOR_ID);
    expect(mockClearPrimaryFlag).toHaveBeenCalledBefore(mockCreateContact);
  });
});

describe("PATCH /api/sponsors/[id]/contacts/[contactId] - edge cases", () => {
  it("returns 400 for invalid sponsor UUID", async () => {
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/invalid/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "invalid", contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid contact UUID", async () => {
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/invalid", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: "invalid" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: "bad json",
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 422 for invalid email in update", async () => {
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ email: "not-valid" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 when sponsor not found during update", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Sponsor not found");
  });

  it("clears primary flag when updating to primary", async () => {
    await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ isPrimary: true }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(mockClearPrimaryFlag).toHaveBeenCalledWith(SPONSOR_ID);
  });

  it("does not clear primary flag when isPrimary is not set", async () => {
    await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(mockClearPrimaryFlag).not.toHaveBeenCalled();
  });

  it("returns 500 when database throws on update", async () => {
    mockUpdateContact.mockRejectedValue(new Error("DB error"));
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(500);
  });

  it("returns 404 when updateContact returns null", async () => {
    mockUpdateContact.mockResolvedValue(null);
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/sponsors/[id]/contacts/[contactId] - edge cases", () => {
  it("returns 400 for invalid sponsor UUID", async () => {
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/invalid/contacts/" + CONTACT_ID, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "invalid", contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid contact UUID", async () => {
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/invalid", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: "invalid" }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(404);
  });
});
