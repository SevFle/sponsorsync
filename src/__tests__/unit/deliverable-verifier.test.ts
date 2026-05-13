import { describe, it, expect, vi, beforeEach } from "vitest";
import { processDeliverableVerification } from "@/lib/inngest/deliverable-verifier";

const { mockSelect, createNotificationMock, sendOverdueMock } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const createNotificationMock = vi.fn().mockResolvedValue({ id: "notif-1" });
  const sendOverdueMock = vi.fn().mockResolvedValue({ id: "email-1" });
  return { mockSelect, createNotificationMock, sendOverdueMock };
});

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/db/schema", () => ({
  deliverables: {
    id: "id", dealId: "dealId", title: "title", description: "description",
    status: "status", dueDate: "dueDate", completedDate: "completedDate",
    verificationData: "verificationData", notes: "notes",
  },
  deals: { id: "id", title: "title", userId: "userId" },
  users: { id: "id", email: "email", name: "name" },
  notificationPreferences: { userId: "userId", deliverableUpdates: "deliverableUpdates" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col, val) => val),
  and: vi.fn((...args) => args),
  isNotNull: vi.fn((col) => col),
  not: vi.fn((val) => val),
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  createNotification: createNotificationMock,
}));

vi.mock("@/lib/email/templates", () => ({
  sendOverdueDeliverableReminder: sendOverdueMock,
}));

function makeUserChain(users: any[]) {
  const chain: Record<string, any> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockResolvedValue(users);
  return chain;
}

function makeDeliverableChain(deliverables: any[]) {
  const chain: Record<string, any> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockResolvedValue(deliverables);
  return chain;
}

function setupQueries(users: any[], deliverables: any[]) {
  const userChain = makeUserChain(users);
  const delivChain = makeDeliverableChain(deliverables);
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    return callCount === 1 ? userChain : delivChain;
  });
  return { userChain, delivChain };
}

describe("processDeliverableVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero summary when no users with preferences", async () => {
    setupQueries([], []);

    const result = await processDeliverableVerification();
    expect(result.usersProcessed).toBe(0);
    expect(result.totalChecked).toBe(0);
    expect(result.reports).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("processes users with deliverableUpdates disabled", async () => {
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: false },
    ];
    const deliverables = [
      {
        id: "d-1", dealId: "deal-1", dealTitle: "Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.usersProcessed).toBe(1);
    expect(result.totalChecked).toBe(1);
    expect(result.notificationsSent).toBe(0);
    expect(result.emailsSent).toBe(0);
  });

  it("sends notification and email for overdue deliverables with prefs enabled", async () => {
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-overdue", dealId: "deal-1", dealTitle: "Big Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.usersProcessed).toBe(1);
    expect(result.totalChecked).toBe(1);
    expect(result.overdueAlerts).toBe(1);
    expect(result.notificationsSent).toBe(1);
    expect(result.emailsSent).toBe(1);

    expect(createNotificationMock).toHaveBeenCalledWith({
      userId: "u-1",
      type: "overdue_deliverable",
      title: "Verification: Overdue Deliverable",
      message: expect.stringContaining("Ad Read"),
      relatedId: "deal-1",
    });

    expect(sendOverdueMock).toHaveBeenCalledWith(
      "a@test.com", "Big Deal", "Ad Read", "2020-01-01"
    );
  });

  it("skips email when user has no email address", async () => {
    const users = [
      { userId: "u-1", email: null, name: "A", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-od", dealId: "deal-1", dealTitle: "Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.notificationsSent).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("handles email send failure gracefully", async () => {
    sendOverdueMock.mockRejectedValueOnce(new Error("SMTP failure"));

    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-od", dealId: "deal-1", dealTitle: "Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.notificationsSent).toBe(1);
    expect(result.emailsSent).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("SMTP failure");
  });

  it("skips users with no deliverables", async () => {
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
    ];
    setupQueries(users, []);

    const result = await processDeliverableVerification();
    expect(result.usersProcessed).toBe(1);
    expect(result.totalChecked).toBe(0);
  });

  it("handles DB errors for individual users and continues", async () => {
    const users = [
      { userId: "u-bad", email: "bad@test.com", name: "Bad", deliverableUpdates: true },
      { userId: "u-good", email: "good@test.com", name: "Good", deliverableUpdates: false },
    ];

    const userChain = makeUserChain(users);

    const badDelivChain: Record<string, any> = {};
    badDelivChain.from = vi.fn().mockReturnValue(badDelivChain);
    badDelivChain.innerJoin = vi.fn().mockReturnValue(badDelivChain);
    badDelivChain.where = vi.fn().mockRejectedValue(new Error("DB connection lost"));

    const goodDelivChain = makeDeliverableChain([
      {
        id: "d-1", dealId: "deal-1", dealTitle: "Good Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: null,
        completedDate: null, verificationData: null, notes: null,
      },
    ]);

    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return userChain;
      if (callCount === 2) return badDelivChain;
      return goodDelivChain;
    });

    const result = await processDeliverableVerification();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("DB connection lost");
    expect(result.usersProcessed).toBe(2);
  });

  it("does not send notification for non-overdue deliverables", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-ok", dealId: "deal-1", dealTitle: "On Track Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: future.toISOString(),
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.notificationsSent).toBe(0);
    expect(result.emailsSent).toBe(0);
    expect(result.totalChecked).toBe(1);
  });

  it("handles multiple overdue deliverables for a single user", async () => {
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-1", dealId: "deal-1", dealTitle: "Deal 1", title: "Ad Read 1",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
      {
        id: "d-2", dealId: "deal-2", dealTitle: "Deal 2", title: "Ad Read 2",
        description: null, status: "pending", dueDate: "2020-02-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];
    setupQueries(users, deliverables);

    const result = await processDeliverableVerification();
    expect(result.totalChecked).toBe(2);
    expect(result.overdueAlerts).toBe(2);
    expect(result.notificationsSent).toBe(2);
    expect(result.emailsSent).toBe(2);
  });

  it("handles multiple users independently", async () => {
    const users = [
      { userId: "u-1", email: "a@test.com", name: "A", deliverableUpdates: true },
      { userId: "u-2", email: "b@test.com", name: "B", deliverableUpdates: true },
    ];
    const deliverables = [
      {
        id: "d-1", dealId: "deal-1", dealTitle: "Deal", title: "Ad Read",
        description: null, status: "pending", dueDate: "2020-01-01",
        completedDate: null, verificationData: null, notes: null,
      },
    ];

    const userChain = makeUserChain(users);
    const delivChain = makeDeliverableChain(deliverables);
    let callCount = 0;
    mockSelect.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? userChain : delivChain;
    });

    const result = await processDeliverableVerification();
    expect(result.usersProcessed).toBe(2);
    expect(result.totalChecked).toBe(2);
    expect(result.notificationsSent).toBe(2);
    expect(result.emailsSent).toBe(2);
  });
});
