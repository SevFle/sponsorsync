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
  updateUser: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserById, updateUser } from "@/lib/db/queries/users";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

function createRequest(data: unknown) {
  return new Request("http://localhost:3000/api/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
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
      image: "https://example.com/avatar.png",
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual({
      name: "Test User",
      email: "test@test.com",
      image: "https://example.com/avatar.png",
    });
  });

  it("returns 404 when user not found", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns profile with null image", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.image).toBeNull();
  });
});

describe("PATCH /api/settings/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await PATCH(createRequest({ name: "New Name" }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
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

  it("returns 422 for empty name", async () => {
    const response = await PATCH(createRequest({ name: "" }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 for invalid image URL", async () => {
    const response = await PATCH(createRequest({ image: "not-a-url" }));
    expect(response.status).toBe(422);
  });

  it("updates profile name", async () => {
    (updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Updated Name",
      image: null,
    });

    const response = await PATCH(createRequest({ name: "Updated Name" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.name).toBe("Updated Name");
    expect(updateUser).toHaveBeenCalledWith("user-1", { name: "Updated Name" });
  });

  it("updates profile image", async () => {
    (updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: "https://example.com/new-avatar.png",
    });

    const response = await PATCH(createRequest({ image: "https://example.com/new-avatar.png" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.image).toBe("https://example.com/new-avatar.png");
  });

  it("allows clearing image with empty string", async () => {
    (updateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: "",
    });

    const response = await PATCH(createRequest({ image: "" }));
    expect(response.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("user-1", { image: "" });
  });

  it("returns 404 when user not found on update", async () => {
    (updateUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await PATCH(createRequest({ name: "New Name" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns 422 for name exceeding max length", async () => {
    const response = await PATCH(createRequest({ name: "a".repeat(101) }));
    expect(response.status).toBe(422);
  });
});
