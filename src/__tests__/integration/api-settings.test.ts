import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/settings/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/settings", () => ({
  getUserProfile: vi.fn(),
  getNotificationPreferences: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserProfile, getNotificationPreferences } from "@/lib/db/queries/settings";

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

const mockNotifications = {
  id: "np-1",
  userId: "user-1",
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
  (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
  (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockNotifications);
});

describe("GET /api/settings", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns combined profile and notification settings", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual(mockProfile);
    expect(body.notifications).toEqual(mockNotifications);
  });

  it("returns null for profile when not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toBeNull();
  });

  it("returns 500 when database query fails", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to fetch settings");
  });
});
