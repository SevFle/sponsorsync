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

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings/profile - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getUserProfile).not.toHaveBeenCalled();
  });
});

describe("GET /api/settings/profile - data fetching", () => {
  it("returns profile for authenticated user", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.email).toBe("test@test.com");
    expect(body.profile.name).toBe("Test User");
    expect(getUserProfile).toHaveBeenCalledWith("user-1");
  });

  it("returns 404 when user not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });
});

describe("PUT /api/settings/profile - updates", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });

  it("updates user profile name", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Updated Name",
      image: null,
    });

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Updated Name");
    expect(updateUserProfile).toHaveBeenCalledWith("user-1", {
      name: "Updated Name",
      image: undefined,
    });
  });

  it("returns 404 when user to update not found", async () => {
    (updateUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns 401 on PUT when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const request = new Request("http://localhost/api/settings/profile", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
  });
});
