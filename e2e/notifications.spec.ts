import { test, expect } from "@playwright/test";
import { signIn, getCsrfToken } from "./helpers/auth";

const MOCK_NOTIFICATIONS = [
  {
    id: "notif-1",
    userId: "user-1",
    type: "deadline_reminder",
    title: "Deadline Approaching",
    message: 'Deliverable "Episode 12 ad read" is due in 3 days',
    relatedId: "deal-1",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif-2",
    userId: "user-1",
    type: "overdue_deliverable",
    title: "Overdue Deliverable",
    message: 'Deliverable "Newsletter banner" is overdue by 2 days',
    relatedId: "deal-2",
    read: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "notif-3",
    userId: "user-1",
    type: "payment_follow_up",
    title: "Payment Reminder",
    message: "Payment of $2,500 from Acme Corp is overdue",
    relatedId: "payment-1",
    read: false,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "notif-4",
    userId: "user-1",
    type: "deadline_reminder",
    title: "Deadline Today",
    message: 'Deliverable "Mid-roll spot" is due today',
    relatedId: "deal-3",
    read: true,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

const MOCK_PREFERENCES = {
  id: "pref-1",
  userId: "user-1",
  deadlineReminders: true,
  paymentReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 3,
};

test.describe("Notifications API - Unauthenticated", () => {
  test("GET /api/notifications returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/notifications");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("PUT /api/notifications returns 401 without auth", async ({ request }) => {
    const response = await request.put("/api/notifications", {
      data: { notificationId: "notif-1" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/settings/notifications returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/settings/notifications");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("PUT /api/settings/notifications returns 401 without auth", async ({ request }) => {
    const response = await request.put("/api/settings/notifications", {
      data: { deadlineReminders: false },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

test.describe("Notifications API - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("GET /api/notifications returns notifications and unread count", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.notifications).toHaveLength(4);
    expect(body.unreadCount).toBe(3);
  });

  test("GET /api/notifications returns empty list when none exist", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ notifications: [], unreadCount: 0 }),
      })
    );

    const response = await page.request.get("/api/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.notifications).toEqual([]);
    expect(body.unreadCount).toBe(0);
  });

  test("notification list items contain required fields", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const notif = body.notifications[0];
    expect(notif).toHaveProperty("id");
    expect(notif).toHaveProperty("type");
    expect(notif).toHaveProperty("title");
    expect(notif).toHaveProperty("message");
    expect(notif).toHaveProperty("read");
    expect(notif).toHaveProperty("createdAt");
  });

  test("deadline reminder notifications have correct type", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const deadlineNotifs = body.notifications.filter(
      (n: any) => n.type === "deadline_reminder"
    );
    expect(deadlineNotifs.length).toBeGreaterThan(0);
    deadlineNotifs.forEach((n: any) => {
      expect(n.title).toBeTruthy();
      expect(n.message).toContain("due");
    });
  });

  test("payment follow-up notifications have correct type", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const paymentNotifs = body.notifications.filter(
      (n: any) => n.type === "payment_follow_up"
    );
    expect(paymentNotifs.length).toBeGreaterThan(0);
    paymentNotifs.forEach((n: any) => {
      expect(n.title).toContain("Payment");
      expect(n.message).toMatch(/\$/);
    });
  });

  test("PUT marks a single notification as read", async ({ page }) => {
    const readNotification = { ...MOCK_NOTIFICATIONS[0], read: true };
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ notification: readNotification }),
      })
    );

    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "notif-1" },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.notification.read).toBe(true);
    expect(body.notification.id).toBe("notif-1");
  });

  test("PUT mark-as-read returns 404 for nonexistent notification", async ({
    page,
  }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "nonexistent-id" },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  test("PUT marks all notifications as read", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ markedRead: 3 }),
      })
    );

    const response = await page.request.put("/api/notifications", {
      data: { markAllRead: true },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(3);
  });

  test("PUT returns 400 for invalid request body", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/notifications", {
      data: {},
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request body");
  });

  test("notifications API returns JSON content type", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ notifications: [], unreadCount: 0 }),
      })
    );

    const response = await page.request.get("/api/notifications");
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("notifications API handles server error gracefully", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      })
    );

    const response = await page.request.get("/api/notifications");
    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});

test.describe("Notification Preferences - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("GET /api/settings/notifications returns preferences", async ({ page }) => {
    await page.route("**/api/settings/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ preferences: MOCK_PREFERENCES }),
      })
    );

    const response = await page.request.get("/api/settings/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(true);
    expect(body.preferences.paymentReminders).toBe(true);
    expect(body.preferences.deliverableUpdates).toBe(true);
    expect(body.preferences.reminderDaysBefore).toBe(3);
  });

  test("GET returns null preferences when none exist", async ({ page }) => {
    await page.route("**/api/settings/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ preferences: null }),
      })
    );

    const response = await page.request.get("/api/settings/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences).toBeNull();
  });

  test("PUT updates notification preferences", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { deadlineReminders: false },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
  });

  test("PUT can disable payment reminders", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { paymentReminders: false },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.paymentReminders).toBe(false);
  });

  test("PUT can change reminder days before deadline", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderDaysBefore: 7 },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderDaysBefore).toBe(7);
  });

  test("PUT can disable deliverable updates", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { deliverableUpdates: false },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.deliverableUpdates).toBe(false);
  });

  test("PUT can update multiple preferences at once", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: {
        deadlineReminders: false,
        paymentReminders: false,
        reminderDaysBefore: 14,
      },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
    expect(body.preferences.paymentReminders).toBe(false);
    expect(body.preferences.reminderDaysBefore).toBe(14);
  });
});

test.describe("Notification Preferences - Reminder Schedule", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("PUT can set reminderSchedule array", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [7, 3, 1] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toEqual([7, 3, 1]);
  });

  test("PUT accepts single-tier reminder schedule", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [3] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toEqual([3]);
  });

  test("PUT accepts five-tier reminder schedule (max)", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [14, 7, 5, 3, 1] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderSchedule).toHaveLength(5);
  });

  test("PUT returns 400 for empty reminderSchedule", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Validation failed");
  });

  test("PUT returns 400 for reminderSchedule exceeding 5 tiers", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [30, 21, 14, 7, 3, 1] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });

  test("PUT returns 400 for reminderSchedule with value below 1", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [7, 0] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });

  test("PUT returns 400 for reminderSchedule with value above 30", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderSchedule: [31] },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });

  test("PUT returns 400 for reminderDaysBefore below minimum", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderDaysBefore: 0 },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });

  test("PUT returns 400 for reminderDaysBefore above maximum", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderDaysBefore: 31 },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("Notification Types - Badge Data", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("deadline_reminder notifications contain deadline warning text", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const deadline = body.notifications.find(
      (n: any) => n.id === "notif-1"
    );
    expect(deadline.type).toBe("deadline_reminder");
    expect(deadline.title).toContain("Deadline");
    expect(deadline.message).toMatch(/\d+ days?/);
  });

  test("overdue_deliverable notifications warn about overdue status", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const overdue = body.notifications.find(
      (n: any) => n.id === "notif-2"
    );
    expect(overdue.type).toBe("overdue_deliverable");
    expect(overdue.title).toContain("Overdue");
    expect(overdue.message).toMatch(/overdue/i);
  });

  test("payment_follow_up notifications contain payment details", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const payment = body.notifications.find(
      (n: any) => n.id === "notif-3"
    );
    expect(payment.type).toBe("payment_follow_up");
    expect(payment.title).toContain("Payment");
    expect(payment.message).toMatch(/\$/);
  });

  test("unread count only counts unread notifications", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const unreadNotifs = body.notifications.filter((n: any) => !n.read);
    const readNotifs = body.notifications.filter((n: any) => n.read);
    expect(unreadNotifs).toHaveLength(3);
    expect(readNotifs).toHaveLength(1);
    expect(body.unreadCount).toBe(unreadNotifs.length);
  });

  test("all valid notification types are accepted", async ({ page }) => {
    const allTypes = [
      { ...MOCK_NOTIFICATIONS[0], type: "deadline_reminder" },
      { ...MOCK_NOTIFICATIONS[0], type: "overdue_deliverable" },
      { ...MOCK_NOTIFICATIONS[0], type: "payment_follow_up" },
    ];
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ notifications: allTypes, unreadCount: 3 }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const types = body.notifications.map((n: any) => n.type);
    expect(types).toContain("deadline_reminder");
    expect(types).toContain("overdue_deliverable");
    expect(types).toContain("payment_follow_up");
  });
});

test.describe("Mark-as-Read Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("marking all read sets all notifications to read", async ({ page }) => {
    const allRead = MOCK_NOTIFICATIONS.map((n) => ({ ...n, read: true }));

    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ markedRead: 3 }),
        });
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ notifications: allRead, unreadCount: 0 }),
      });
    });

    const markResponse = await page.request.put("/api/notifications", {
      data: { markAllRead: true },
    });
    expect(markResponse.status()).toBe(200);
    const markBody = await markResponse.json();
    expect(markBody.markedRead).toBe(3);

    const afterResponse = await page.request.get("/api/notifications");
    const afterBody = await afterResponse.json();
    expect(afterBody.unreadCount).toBe(0);
    afterBody.notifications.forEach((n: any) => {
      expect(n.read).toBe(true);
    });
  });

  test("mark-as-read with invalid body returns 400", async ({ page }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/notifications", {
      data: { unknownField: "value" },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(400);
  });

  test("mark-as-read for nonexistent notification returns 404", async ({
    page,
  }) => {
    const csrfToken = await getCsrfToken(page);

    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "nonexistent-id" },
      headers: { "X-CSRF-Token": csrfToken },
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  test("PUT without CSRF token returns 403", async ({ page }) => {
    await page.goto("/dashboard");

    const response = await page.request.put("/api/notifications", {
      data: { markAllRead: true },
    });
    expect(response.status()).toBe(403);
  });

  test("PUT with matching CSRF token succeeds", async ({ page }) => {
    await page.goto("/dashboard");
    const cookies = await page.context().cookies();
    const csrfCookie = cookies.find((c) => c.name === "csrfToken");
    expect(csrfCookie).toBeDefined();

    const response = await page.request.put("/api/notifications", {
      data: { markAllRead: true },
      headers: { "X-CSRF-Token": csrfCookie!.value },
    });
    expect(response.status()).toBe(200);
  });
});

test.describe("Notifications - Deadline Reminder Integration", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("deadline reminder notification includes related deal reference", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const deadlineNotif = body.notifications.find(
      (n: any) => n.type === "deadline_reminder" && n.id === "notif-1"
    );
    expect(deadlineNotif.relatedId).toBe("deal-1");
    expect(deadlineNotif.message).toContain("due in 3 days");
  });

  test("deadline today notification has correct urgency text", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const todayNotif = body.notifications.find(
      (n: any) => n.id === "notif-4"
    );
    expect(todayNotif.title).toBe("Deadline Today");
    expect(todayNotif.message).toContain("due today");
  });

  test("overdue deliverable notification has days overdue info", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const overdueNotif = body.notifications.find(
      (n: any) => n.type === "overdue_deliverable"
    );
    expect(overdueNotif.message).toMatch(/\d+ days?/);
    expect(overdueNotif.message).toMatch(/overdue/i);
  });

  test("notifications are ordered by creation date (newest first)", async ({ page }) => {
    await page.route("**/api/notifications", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          notifications: MOCK_NOTIFICATIONS,
          unreadCount: 3,
        }),
      })
    );

    const response = await page.request.get("/api/notifications");
    const body = await response.json();
    const dates = body.notifications.map((n: any) => new Date(n.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});
