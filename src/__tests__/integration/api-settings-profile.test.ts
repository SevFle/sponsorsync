import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/settings/profile/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserProfile, updateUserProfile } from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

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

  it("returns user profile", async () => {
    const mockProfile = {
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Test User");
    expect(body.profile.email).toBe("test@test.com");
    expect(body.profile.image).toBe("https://example.com/avatar.png");
  });

  it("returns 404 when profile not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Profile not found");
  });

  it("returns 500 on database error", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch profile");
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

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 422 for validation errors", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("updates profile name successfully", async () => {
    const updatedProfile = {
      id: "user-1",
      email: "test@test.com",
      name: "Updated Name",
      image: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date(),
    };

    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedProfile);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Updated Name");
    expect(updateUserProfile).toHaveBeenCalledWith("user-1", { name: "Updated Name" });
  });

  it("returns 404 when profile not found on update", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Profile not found");
  });

  it("returns 500 on database error", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to update profile");
  });
});
