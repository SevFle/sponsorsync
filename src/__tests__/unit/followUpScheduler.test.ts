import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendTemplateEmail = vi.fn().mockResolvedValue({ id: "email-id" });
const mockCheckRateLimit = vi.fn().mockReturnValue({ allowed: true, remaining: 49 });
const mockResolveVariables = vi.fn().mockResolvedValue({
  variables: {
    creator_name: "John",
    creator_show: "My Show",
    sponsor_name: "Acme",
    sponsor_email: "acme@test.com",
    deal_title: "Big Deal",
    deal_amount: "$500",
  },
  missing: [],
});

function createThenable(value: unknown) {
  const self: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(value).then(resolve, reject),
    select: vi.fn().mockImplementation(() => createThenable(value)),
    from: vi.fn().mockImplementation(() => createThenable(value)),
    innerJoin: vi.fn().mockImplementation(() => createThenable(value)),
    where: vi.fn().mockImplementation(() => createThenable(value)),
    limit: vi.fn().mockImplementation(() => createThenable(value)),
    delete: vi.fn().mockImplementation(() => createThenable(value)),
  };
  return self;
}

let nextDbResult: unknown = [];

vi.mock("@/lib/db", () => ({
  get db() {
    const result = nextDbResult;
    return createThenable(result);
  },
}));

vi.mock("@/lib/email/emailService", () => ({
  sendTemplateEmail: (...args: unknown[]) => mockSendTemplateEmail(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/templates/variableResolver", () => ({
  resolveVariables: (...args: unknown[]) => mockResolveVariables(...args),
}));

import {
  FOLLOW_UP_RULES,
  sendFollowUp,
  type FollowUpEntry,
} from "@/lib/templates/followUpScheduler";

describe("FOLLOW_UP_RULES", () => {
  it("contains all expected trigger types", () => {
    const triggers = FOLLOW_UP_RULES.map((r) => r.trigger);
    expect(triggers).toContain("deliverable_due_soon");
    expect(triggers).toContain("deliverable_overdue");
    expect(triggers).toContain("payment_due_soon");
    expect(triggers).toContain("payment_overdue");
    expect(triggers).toContain("deal_expiring_soon");
    expect(triggers).toContain("deal_renewal_opportunity");
  });

  it("each rule maps to a template category", () => {
    for (const rule of FOLLOW_UP_RULES) {
      expect(rule.templateCategory).toBeTruthy();
      expect(rule.description).toBeTruthy();
    }
  });
});

describe("sendFollowUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTemplateEmail.mockResolvedValue({ id: "email-id" });
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 49 });
    mockResolveVariables.mockResolvedValue({
      variables: {
        creator_name: "John",
        creator_show: "My Show",
        sponsor_name: "Acme",
        sponsor_email: "acme@test.com",
        deal_title: "Big Deal",
        deal_amount: "$500",
      },
      missing: [],
    });
  });

  it("sends follow-up email using resolved variables", async () => {
    nextDbResult = [{ subject: "Hi {{sponsor_name}}", body: "<p>{{sponsor_name}}</p>" }];

    const entry: FollowUpEntry = {
      trigger: "deliverable_due_soon",
      sponsorId: "s-1",
      sponsorEmail: "sponsor@test.com",
      sponsorName: "Acme",
      dealId: "d-1",
      dealTitle: "Big Deal",
      deliverableId: "del-1",
      userId: "user-1",
    };

    await sendFollowUp(entry);

    expect(mockSendTemplateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sponsor@test.com",
        variables: expect.objectContaining({
          sponsor_name: "Acme",
          deal_title: "Big Deal",
        }),
      })
    );
  });

  it("throws when no rule found for trigger", async () => {
    const entry: FollowUpEntry = {
      trigger: "unknown_trigger" as any,
      sponsorId: "s-1",
      sponsorEmail: "sponsor@test.com",
      sponsorName: "Acme",
      dealId: "d-1",
      dealTitle: "Deal",
      userId: "user-1",
    };

    await expect(sendFollowUp(entry)).rejects.toThrow("No rule found");
  });

  it("throws when sponsor has no email", async () => {
    const entry: FollowUpEntry = {
      trigger: "deliverable_due_soon",
      sponsorId: "s-1",
      sponsorEmail: null,
      sponsorName: "Acme",
      dealId: "d-1",
      dealTitle: "Deal",
      userId: "user-1",
    };

    await expect(sendFollowUp(entry)).rejects.toThrow("No email address");
  });

  it("throws when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

    const entry: FollowUpEntry = {
      trigger: "deliverable_due_soon",
      sponsorId: "s-1",
      sponsorEmail: "sponsor@test.com",
      sponsorName: "Acme",
      dealId: "d-1",
      dealTitle: "Deal",
      userId: "user-1",
    };

    await expect(sendFollowUp(entry)).rejects.toThrow("Rate limit");
  });

  it("uses default template when no user template exists", async () => {
    nextDbResult = [];

    const entry: FollowUpEntry = {
      trigger: "payment_overdue",
      sponsorId: "s-1",
      sponsorEmail: "sponsor@test.com",
      sponsorName: "Acme",
      dealId: "d-1",
      dealTitle: "Deal",
      userId: "user-1",
    };

    await sendFollowUp(entry);

    expect(mockSendTemplateEmail).toHaveBeenCalled();
    const call = mockSendTemplateEmail.mock.calls[0][0];
    expect(call.subject).toBeDefined();
    expect(call.body).toContain("{{");
  });
});
