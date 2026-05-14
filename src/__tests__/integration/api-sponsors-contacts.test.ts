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
  company: "Acme Inc",
  email: "acme@test.com",
  phone: null,
  notes: null,
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

describe("GET /api/sponsors/[id]/contacts", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns contacts for a sponsor", async () => {
    const response = await ContactsGet(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts"),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0].name).toBe("Jane Doe");
  });
});

describe("POST /api/sponsors/[id]/contacts", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(401);
  });

  it("creates a contact with valid data", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane Doe",
          email: "jane@test.com",
          role: "Marketing Director",
          phone: "+1234567890",
          isPrimary: true,
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );

    expect(response.status).toBe(201);
    expect(mockClearPrimaryFlag).toHaveBeenCalledWith(SPONSOR_ID);
    expect(mockCreateContact).toHaveBeenCalledWith(
      expect.objectContaining({
        sponsorId: SPONSOR_ID,
        name: "Jane Doe",
        email: "jane@test.com",
        isPrimary: true,
      })
    );
  });

  it("returns 422 for invalid data", async () => {
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "", email: "not-an-email" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(422);
  });

  it("returns 404 when sponsor not found", async () => {
    mockGetSponsorById.mockResolvedValue(null);
    const response = await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(response.status).toBe(404);
  });

  it("does not clear primary flag when isPrimary is false", async () => {
    await ContactsPost(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Jane", email: "jane@test.com", isPrimary: false }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID }) }
    );
    expect(mockClearPrimaryFlag).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/sponsors/[id]/contacts/[contactId]", () => {
  it("updates a contact", async () => {
    const response = await ContactPatch(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "PATCH",
        body: JSON.stringify({ name: "Jane Updated" }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockUpdateContact).toHaveBeenCalledWith(
      CONTACT_ID,
      { name: "Jane Updated" },
      SPONSOR_ID
    );
  });

  it("returns 404 when contact not found", async () => {
    mockGetContactById.mockResolvedValue(null);
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

describe("DELETE /api/sponsors/[id]/contacts/[contactId]", () => {
  it("deletes a contact", async () => {
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(200);
    expect(mockDeleteContact).toHaveBeenCalledWith(CONTACT_ID, SPONSOR_ID);
    const body = await response.json();
    expect(body.deleted).toBe(true);
  });

  it("returns 404 when contact not found", async () => {
    mockDeleteContact.mockResolvedValue(null);
    const response = await ContactDelete(
      new Request("http://localhost:3000/api/sponsors/" + SPONSOR_ID + "/contacts/" + CONTACT_ID, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: SPONSOR_ID, contactId: CONTACT_ID }) }
    );
    expect(response.status).toBe(404);
  });
});
