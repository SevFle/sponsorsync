import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "@/app/api/settings/notifications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns default notification settings", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual({
      emailNotifications: true,
      dealReminders: true,
      paymentAlerts: true,
      weeklyDigest: false,
    });
  });
});

describe("PUT /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ emailNotifications: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for invalid notification settings", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ emailNotifications: "yes" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PUT(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("updates notification settings", async () => {
    const notificationData = {
      emailNotifications: false,
      dealReminders: false,
      paymentAlerts: true,
      weeklyDigest: true,
    };
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify(notificationData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual(notificationData);
  });

  it("accepts partial notification settings", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PUT",
      body: JSON.stringify({ weeklyDigest: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifications).toEqual({ weeklyDigest: true });
  });
});
