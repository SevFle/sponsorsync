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

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("GET /api/settings - auth guards", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth({ user: {} } as any);
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("GET /api/settings - data fetching", () => {
  it("fetches profile and notification preferences in parallel", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
    });
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.email).toBe("test@test.com");
    expect(body.notificationPreferences.deadlineReminders).toBe(true);
    expect(body.notificationPreferences.reminderDaysBefore).toBe(5);
    expect(getUserProfile).toHaveBeenCalledWith("user-1");
    expect(getNotificationPreferences).toHaveBeenCalledWith("user-1");
  });

  it("returns defaults when no notification preferences exist", async () => {
    (getUserProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: null,
      image: null,
    });
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notificationPreferences).toEqual({
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
    });
  });

  it("does not query database when unauthenticated", async () => {
    mockAuth(null);
    await GET();
    expect(getUserProfile).not.toHaveBeenCalled();
    expect(getNotificationPreferences).not.toHaveBeenCalled();
  });
});
