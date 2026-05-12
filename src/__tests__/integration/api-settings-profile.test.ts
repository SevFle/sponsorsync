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
}));

import { getServerSession } from "next-auth";
import { getUserProfile, updateUserProfile } from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test User" } };

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

  it("returns profile when authenticated", async () => {
    const mockProfile = { id: "user-1", email: "test@test.com", name: "Test User", image: null };
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile).toEqual(mockProfile);
  });

  it("returns 404 when user not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("User not found");
  });

  it("returns JSON content type", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1", email: "test@test.com", name: "Test", image: null,
    });

    const response = await GET();
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("calls getUserProfile with session user id", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1", email: "test@test.com", name: "Test", image: null,
    });

    await GET();
    expect(getUserProfile).toHaveBeenCalledWith("user-1");
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
  });

  it("updates name and returns updated profile", async () => {
    const updatedProfile = { id: "user-1", email: "test@test.com", name: "New Name", image: null };
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updatedProfile);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profile).toEqual(updatedProfile);
    expect(updateUserProfile).toHaveBeenCalledWith("user-1", { name: "New Name" });
  });

  it("returns 404 when user not found during update", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.status).toBe(404);
  });

  it("returns JSON content type on update", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1", email: "test@test.com", name: "Test", image: null,
    });

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("handles session without user id as unauthenticated", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns error JSON for 401 response", async () => {
    mockAuth(null);
    const response = await GET();
    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toBe("Unauthorized");
  });
});
