import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/settings/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/users", () => ({
  getUserById: vi.fn(),
}));

vi.mock("@/lib/db/queries/notification-preferences", () => ({
  getNotificationPreferencesByUserId: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getUserById } from "@/lib/db/queries/users";
import { getNotificationPreferencesByUserId } from "@/lib/db/queries/notification-preferences";

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

  it("returns user settings with profile and notifications", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
    });
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np-1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: true,
      deliverableUpdates: false,
      reminderDaysBefore: 5,
    });

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
      paymentReminders: true,
      deliverableUpdates: false,
      reminderDaysBefore: 5,
    });
  });

  it("returns null notifications when no preferences exist", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: null,
    });
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.notifications).toBeNull();
  });

  it("returns 404 when user is not found", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("User not found");
  });

  it("returns profile with image when user has one", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      email: "test@test.com",
      name: "Test User",
      image: "https://example.com/avatar.png",
    });
    (getNotificationPreferencesByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.settings.profile.image).toBe("https://example.com/avatar.png");
  });
});
