import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/settings/profile/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockSession = {
  user: { id: "user-1", email: "test@test.com", name: "Test User" },
};

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns profile from session", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual({
      name: "Test User",
      email: "test@test.com",
    });
  });

  it("handles null name and email gracefully", async () => {
    mockAuth({ user: { id: "user-2", name: null as unknown as string, email: null as unknown as string } });
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual({ name: "", email: "" });
  });
});

describe("PUT /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid profile data", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ email: "not-an-email" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates profile and returns it", async () => {
    const profileData = {
      name: "Updated Name",
      email: "updated@test.com",
      company: "Acme Inc",
      timezone: "America/New_York",
    };
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual(profileData);
  });

  it("accepts partial profile updates", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ company: "New Corp" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual({ company: "New Corp" });
  });
});
