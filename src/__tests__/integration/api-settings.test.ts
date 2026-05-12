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
  upsertNotificationPreferences: vi.fn(),
  updateUserProfile: vi.fn(),
}));

import { getServerSession } from "next-auth";
import {
  getUserProfile,
  getNotificationPreferences,
} from "@/lib/db/queries/settings";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns settings with profile and notifications", async () => {
    const mockProfile = {
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockPrefs = {
      id: "pref-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(mockPrefs);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.profile).toEqual({
      name: "Test User",
      email: "test@test.com",
      image: null,
    });
    expect(body.settings.notifications).toEqual({
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
    });
  });

  it("returns default notifications when no prefs exist", async () => {
    const mockProfile = {
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.notifications).toEqual({
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });
  });

  it("returns null profile when not found", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.profile).toBeNull();
  });

  it("returns 500 on database error", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to fetch settings");
  });
});
