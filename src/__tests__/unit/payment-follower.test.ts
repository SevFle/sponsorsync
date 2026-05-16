import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  notificationKeyExists: vi.fn().mockResolvedValue(false),
  sendPaymentFollowUp: vi.fn().mockResolvedValue({ id: "email-1" }),
}));

vi.mock("@/lib/db", () => {
  const selectWhere = vi.fn();
  const selectInnerJoin = vi.fn(() => ({ where: selectWhere }));
  const selectFrom = vi.fn(() => ({
    where: selectWhere,
    innerJoin: selectInnerJoin,
  }));
  const select = vi.fn(() => ({ from: selectFrom }));

  return { db: { select } };
});

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", name: "name" },
  notificationPreferences: {
    userId: "user_id",
    paymentReminders: "payment_reminders",
  },
  payments: {
    id: "id",
    amount: "amount",
    currency: "currency",
    dueDate: "due_date",
    status: "status",
    dealId: "deal_id",
  },
  deals: { id: "id", title: "title", userId: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  isNotNull: vi.fn((col) => col),
  lt: vi.fn((col, val) => ({ col, val })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: any[]) => strings.join("")),
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  createNotification: mocks.createNotification,
  notificationKeyExists: mocks.notificationKeyExists,
}));

vi.mock("@/lib/email/templates", () => ({
  sendPaymentFollowUp: mocks.sendPaymentFollowUp,
}));

import { processPaymentFollowUps } from "@/lib/inngest/payment-follower";
import { db } from "@/lib/db";

const mockUser = {
  userId: "user-1",
  email: "creator@test.com",
  name: "Test Creator",
  paymentReminders: true,
};

const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processPaymentFollowUps", () => {
  it("returns empty summary when no users have payment reminders enabled", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })),
    }));

    const result = await processPaymentFollowUps();
    expect(result.usersProcessed).toBe(0);
    expect(result.notificationsCreated).toBe(0);
    expect(result.emailsSent).toBe(0);
  });

  it("creates notifications and sends emails for overdue payments", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([mockUser]) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: "pay-1",
              amount: 50000,
              currency: "USD",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "pending",
              dealId: "deal-1",
              dealTitle: "Big Sponsor",
            },
          ]),
        })),
      })),
    }));

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendPaymentFollowUp.mockResolvedValue({ id: "email-1" });

    const result = await processPaymentFollowUps();
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(1);
    expect(result.usersProcessed).toBe(1);
    expect(mocks.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "payment_follow_up",
        title: "Overdue Payment",
      })
    );
    expect(mocks.sendPaymentFollowUp).toHaveBeenCalledWith(
      "creator@test.com",
      "Big Sponsor",
      "$500.00",
      expect.any(String)
    );
  });

  it("handles multiple overdue payments for a user", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([mockUser]) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: "pay-1",
              amount: 50000,
              currency: "USD",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "pending",
              dealId: "deal-1",
              dealTitle: "Sponsor A",
            },
            {
              id: "pay-2",
              amount: 25000,
              currency: "USD",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "overdue",
              dealId: "deal-2",
              dealTitle: "Sponsor B",
            },
          ]),
        })),
      })),
    }));

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendPaymentFollowUp.mockResolvedValue({ id: "email-1" });

    const result = await processPaymentFollowUps();
    expect(result.notificationsCreated).toBe(2);
    expect(result.emailsSent).toBe(2);
  });

  it("skips email when user has no email address", async () => {
    const noEmailUser = { ...mockUser, email: null };

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([noEmailUser]) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: "pay-1",
              amount: 50000,
              currency: "USD",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "pending",
              dealId: "deal-1",
              dealTitle: "Sponsor",
            },
          ]),
        })),
      })),
    }));

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });

    const result = await processPaymentFollowUps();
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("captures errors during email sending", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([mockUser]) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: "pay-1",
              amount: 50000,
              currency: "USD",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "pending",
              dealId: "deal-1",
              dealTitle: "Sponsor",
            },
          ]),
        })),
      })),
    }));

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendPaymentFollowUp.mockRejectedValue(new Error("SMTP failure"));

    const result = await processPaymentFollowUps();
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("SMTP failure");
    expect(result.notificationsCreated).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("captures errors during user processing without stopping the loop", async () => {
    const failingUser = { ...mockUser, userId: "bad-user" };
    const goodUser = { ...mockUser, userId: "good-user" };

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([failingUser, goodUser]),
        })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockRejectedValue(new Error("DB error")) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
      })),
    }));

    const result = await processPaymentFollowUps();
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("DB error");
    expect(result.usersProcessed).toBe(1);
  });

  it("formats currency amounts correctly", async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({ where: vi.fn().mockResolvedValue([mockUser]) })),
      })),
    }));

    (db.select as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            {
              id: "pay-1",
              amount: 150000,
              currency: "EUR",
              dueDate: pastDate.toISOString().split("T")[0],
              status: "pending",
              dealId: "deal-1",
              dealTitle: "EU Sponsor",
            },
          ]),
        })),
      })),
    }));

    mocks.createNotification.mockResolvedValue({ id: "notif-1" });
    mocks.sendPaymentFollowUp.mockResolvedValue({ id: "email-1" });

    await processPaymentFollowUps();
    expect(mocks.sendPaymentFollowUp).toHaveBeenCalledWith(
      "creator@test.com",
      "EU Sponsor",
      "€1,500.00",
      expect.any(String)
    );
  });
});
