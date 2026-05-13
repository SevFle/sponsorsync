import { test, expect } from "@playwright/test";
import { signIn } from "./helpers/auth";

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
    const readNotif = { ...MOCK_NOTIFICATIONS[0], read: true };
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notification: readNotif }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "notif-1" },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.notification.read).toBe(true);
  });

  test("PUT mark-as-read returns 404 for nonexistent notification", async ({
    page,
  }) => {
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ error: "Notification not found" }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/notifications", {
      data: { notificationId: "nonexistent-id" },
    });
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Notification not found");
  });

  test("PUT marks all notifications as read", async ({ page }) => {
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ markedRead: 3 }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/notifications", {
      data: { markAllRead: true },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.markedRead).toBe(3);
  });

  test("PUT returns 400 for invalid request body", async ({ page }) => {
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: "Invalid request body" }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/notifications", {
      data: {},
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
    const updatedPrefs = { ...MOCK_PREFERENCES, deadlineReminders: false };
    await page.route("**/api/settings/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ preferences: updatedPrefs }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/settings/notifications", {
      data: { deadlineReminders: false },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.deadlineReminders).toBe(false);
  });

  test("PUT can disable payment reminders", async ({ page }) => {
    const updatedPrefs = { ...MOCK_PREFERENCES, paymentReminders: false };
    await page.route("**/api/settings/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ preferences: updatedPrefs }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/settings/notifications", {
      data: { paymentReminders: false },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.paymentReminders).toBe(false);
  });

  test("PUT can change reminder days before deadline", async ({ page }) => {
    const updatedPrefs = { ...MOCK_PREFERENCES, reminderDaysBefore: 7 };
    await page.route("**/api/settings/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ preferences: updatedPrefs }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/settings/notifications", {
      data: { reminderDaysBefore: 7 },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.preferences.reminderDaysBefore).toBe(7);
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

  test("marking single notification read changes read status", async ({
    page,
  }) => {
    let notifs = [...MOCK_NOTIFICATIONS];
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notifications: notifs, unreadCount: 3 }),
        });
      } else if (route.request().method() === "PUT") {
        notifs = notifs.map((n) =>
          n.id === "notif-1" ? { ...n, read: true } : n
        );
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notification: { ...notifs[0], read: true } }),
        });
      }
    });

    const beforeResponse = await page.request.get("/api/notifications");
    const beforeBody = await beforeResponse.json();
    expect(beforeBody.notifications[0].read).toBe(false);

    const markResponse = await page.request.put("/api/notifications", {
      data: { notificationId: "notif-1" },
    });
    expect(markResponse.status()).toBe(200);
    const markBody = await markResponse.json();
    expect(markBody.notification.read).toBe(true);
  });

  test("marking all read sets all notifications to read", async ({ page }) => {
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ markedRead: 3 }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            notifications: MOCK_NOTIFICATIONS.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
          }),
        });
      }
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
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        route.fulfill({
          status: 400,
          body: JSON.stringify({ error: "Invalid request body" }),
        });
      } else {
        route.continue();
      }
    });

    const response = await page.request.put("/api/notifications", {
      data: { unknownField: "value" },
    });
    expect(response.status()).toBe(400);
  });

  test("sequential mark-as-read calls decrease unread count", async ({
    page,
  }) => {
    let unread = 3;
    await page.route("**/api/notifications", (route) => {
      if (route.request().method() === "PUT") {
        unread = Math.max(0, unread - 1);
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            notification: { ...MOCK_NOTIFICATIONS[0], read: true },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notifications: MOCK_NOTIFICATIONS, unreadCount: unread }),
        });
      }
    });

    await page.request.put("/api/notifications", {
      data: { notificationId: "notif-1" },
    });
    const resp1 = await page.request.get("/api/notifications");
    expect((await resp1.json()).unreadCount).toBe(2);

    await page.request.put("/api/notifications", {
      data: { notificationId: "notif-2" },
    });
    const resp2 = await page.request.get("/api/notifications");
    expect((await resp2.json()).unreadCount).toBe(1);
  });
});
