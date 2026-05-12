import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/settings/profile/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserProfile, updateUserProfile } from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

const mockProfile = {
  id: "user-1",
  email: "test@test.com",
  name: "Test User",
  image: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
  (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
});

describe("GET /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns user profile", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual(mockProfile);
  });

  it("returns 404 when profile not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Profile not found");
  });
});

describe("PATCH /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 422 for invalid input data", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("updates profile and returns updated data", async () => {
    const updatedProfile = { ...mockProfile, name: "Updated Name" };
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedProfile);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Updated Name");
    expect(updateUserProfile).toHaveBeenCalledWith("user-1", { name: "Updated Name" });
  });

  it("returns 404 when user profile not found for update", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Profile not found");
  });
});
