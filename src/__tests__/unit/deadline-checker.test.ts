import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  notificationKeyExists: vi.fn().mockResolvedValue(false),
  sendDeadlineReminder: vi.fn().mockResolvedValue({ id: "email-1" }),
  sendOverdueDeliverableReminder: vi.fn().mockResolvedValue({ id: "email-2" }),
  sendTemplatedEmail: vi.fn().mockResolvedValue({ id: "templated-email-1" }),
}));

function createQueryResult(value: any) {
  const self: any = {
    then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject),
    where: vi.fn().mockImplementation(() => createQueryResult(value)),
    limit: vi.fn().mockImplementation(() => createQueryResult(value)),
  };
  return self;
}

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", name: "name" },
  notificationPreferences: {
    userId: "user_id",
    deadlineReminders: "deadline_reminders",
    deliverableUpdates: "deliverable_updates",
    reminderDaysBefore: "reminder_days_before",
    reminderSchedule: "reminder_schedule",
  },
  deliverables: {
    id: "id",
    title: "title",
    dueDate: "due_date",
    status: "status",
    dealId: "deal_id",
  },
  deals: { id: "id", title: "title", userId: "user_id", sponsorId: "sponsor_id" },
  sponsors: { id: "id", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  isNotNull: vi.fn((col) => col),
  not: vi.fn((val) => val),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => strings.join("")),
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  createNotification: mocks.createNotification,
  notificationKeyExists: mocks.notificationKeyExists,
}));

vi.mock("@/lib/email/templates", () => ({
  sendDeadlineReminder: mocks.sendDeadlineReminder,
  sendOverdueDeliverableReminder: mocks.sendOverdueDeliverableReminder,
}));

vi.mock("@/lib/email/client", () => ({
  sendTemplatedEmail: mocks.sendTemplatedEmail,
}));

import { processDeadlineChecks } from "@/lib/inngest/deadline-checker";
import { db } from "@/lib/db";

const mockUser = {
  userId: "user-1",
  email: "creator@test.com",
  name: "Test Creator",
  deadlineReminders: true,
  deliverableUpdates: true,
  reminderDaysBefore: 7,
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

const inFiveDays = new Date();
inFiveDays.setDate(inFiveDays.getDate() + 5);

function mockSelectSequence(...results: any[]) {
  let callIndex = 0;
  (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => createQueryResult(results[callIndex++])),
    })),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processDeadlineChecks", () => {
  it("returns empty summary when no users have notification preferences", async () => {
    mockSelectSequence([]);

    const result = await processDeadlineChecks();
    expect(result.usersProcessed).toBe(0);
    expect(result.notificationsCreated).toBe(0);
    expect(result.emailsSent).toBe(0);
  });

  it("creates notifications for upcoming deadlines", async () => {
    mockSelectSequence(
      [mockUser],
      [
        {
          id: "del-1",
          title: "Podcast Ad",
          dueDate: inFiveDays.toISOString().split("T")[0],
          status: "pending",
          dealId: "deal-1",
          dealTitle: "Big Sponsor",
        },
      ],
      [{ name: "Big Sponsor" }]
    );

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendTemplatedEmail.mockResolvedValue({ id: "email-1" });

    const result = await processDeadlineChecks();
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(1);
    expect(result.usersProcessed).toBe(1);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "deadline_reminder",
      })
    );
    expect(mocks.sendTemplatedEmail).toHaveBeenCalledWith(
      "deliverable-reminder",
      expect.objectContaining({ isOverdue: false }),
      { to: "creator@test.com" }
    );
  });

  it("creates overdue notifications for past-due deliverables", async () => {
    mockSelectSequence(
      [mockUser],
      [
        {
          id: "del-2",
          title: "Late Deliverable",
          dueDate: yesterday.toISOString().split("T")[0],
          status: "pending",
          dealId: "deal-2",
          dealTitle: "Late Sponsor",
        },
      ],
      [{ name: "Late Sponsor" }]
    );

    mocks.createNotification.mockResolvedValue({ id: "notif-2" });
    mocks.sendTemplatedEmail.mockResolvedValue({ id: "email-2" });

    const result = await processDeadlineChecks();
    expect(result.notificationsCreated).toBe(1);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "overdue_deliverable",
        title: "Overdue Deliverable",
      })
    );
    expect(mocks.sendTemplatedEmail).toHaveBeenCalledWith(
      "deliverable-reminder",
      expect.objectContaining({ isOverdue: true }),
      { to: "creator@test.com" }
    );
  });

  it("skips email when user has no email address", async () => {
    const noEmailUser = { ...mockUser, email: null };
    mockSelectSequence(
      [noEmailUser],
      [
        {
          id: "del-1",
          title: "Podcast Ad",
          dueDate: inFiveDays.toISOString().split("T")[0],
          status: "pending",
          dealId: "deal-1",
          dealTitle: "Sponsor",
        },
      ]
    );

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });

    const result = await processDeadlineChecks();
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("captures errors during email sending", async () => {
    mockSelectSequence(
      [mockUser],
      [
        {
          id: "del-1",
          title: "Podcast Ad",
          dueDate: inFiveDays.toISOString().split("T")[0],
          status: "pending",
          dealId: "deal-1",
          dealTitle: "Sponsor",
        },
      ],
      [{ name: "Sponsor" }]
    );

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendTemplatedEmail.mockRejectedValue(new Error("SMTP failure"));

    const result = await processDeadlineChecks();
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("SMTP failure");
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("captures errors during user processing without stopping the loop", async () => {
    const failingUser = { ...mockUser, userId: "bad-user" };
    const goodUser = { ...mockUser, userId: "good-user" };

    let callIndex = 0;
    const results = [
      [failingUser, goodUser],
      new Error("DB error"),
      [],
    ];
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => {
          const r = results[callIndex++];
          if (r instanceof Error) {
            return {
              then: (resolve: any, reject: any) => Promise.reject(r).then(resolve, reject),
              where: vi.fn().mockRejectedValue(r),
            };
          }
          return createQueryResult(r);
        }),
      })),
    }));

    const result = await processDeadlineChecks();
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("DB error");
    expect(result.usersProcessed).toBe(1);
  });

  it("skips notifications when deadlineReminders is disabled", async () => {
    const disabledUser = { ...mockUser, deadlineReminders: false };
    mockSelectSequence(
      [disabledUser],
      [
        {
          id: "del-1",
          title: "Ad",
          dueDate: inFiveDays.toISOString().split("T")[0],
          status: "pending",
          dealId: "deal-1",
          dealTitle: "Sponsor",
        },
      ]
    );

    const result = await processDeadlineChecks();
    expect(result.notificationsCreated).toBe(0);
    expect(result.emailsSent).toBe(0);
    expect(result.usersProcessed).toBe(1);
  });
});
