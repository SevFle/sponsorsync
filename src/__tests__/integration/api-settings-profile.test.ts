import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/settings/profile/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/users", () => ({
  getUserById: vi.fn(),
  updateUserName: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserById, updateUserName } from "@/lib/db/queries/users";

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
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
      createdAt: new Date(),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.email).toBe("test@test.com");
    expect(body.profile.name).toBe("Test User");
  });

  it("returns 404 when user not found", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("User not found");
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
  });

  it("updates user name and returns profile", async () => {
    (updateUserName as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "New Name",
      image: null,
    });

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("New Name");
    expect(updateUserName).toHaveBeenCalledWith("user-1", "New Name");
  });

  it("returns 400 for empty name", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for missing name", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for name exceeding 100 characters", async () => {
    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "a".repeat(101) }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("returns 404 when user not found after update", async () => {
    (updateUserName as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/api/settings/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(404);
  });
});
