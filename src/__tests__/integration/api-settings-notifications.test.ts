import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/settings/notifications/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreferences: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getNotificationPreferences, upsertNotificationPreferences } from "@/lib/db/queries/notifications";

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

  it("returns saved notification preferences", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(true);
    expect(body.preferences.paymentReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(5);
  });

  it("returns defaults when no preferences exist", async () => {
    (getNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(true);
    expect(body.preferences.paymentReminders).toBe(true);
    expect(body.preferences.deliverableUpdates).toBe(true);
    expect(body.preferences.reminderDaysBefore).toBe(3);
  });
});

describe("PATCH /api/settings/notifications", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: false }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("updates notification preferences", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np1",
      userId: "user-1",
      deadlineReminders: false,
      paymentReminders: true,
      deliverableUpdates: true,
      reminderDaysBefore: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: false, reminderDaysBefore: 7 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(7);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      deadlineReminders: false,
      reminderDaysBefore: 7,
    });
  });

  it("returns 400 for invalid reminderDaysBefore (0)", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ reminderDaysBefore: 0 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid reminderDaysBefore (31)", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ reminderDaysBefore: 31 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for non-boolean deadlineReminders", async () => {
    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ deadlineReminders: "yes" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("accepts partial updates", async () => {
    (upsertNotificationPreferences as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "np1",
      userId: "user-1",
      deadlineReminders: true,
      paymentReminders: false,
      deliverableUpdates: true,
      reminderDaysBefore: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new Request("http://localhost:3000/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ paymentReminders: false }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      paymentReminders: false,
    });
  });
});
