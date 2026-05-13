import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/deliverables/verify/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("POST /api/deliverables/verify", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 for validation failure", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify({ deliverableId: "not-a-uuid" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns verification report for valid ad_read deliverable", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Acme Sponsorship",
      title: "Podcast Ad Read",
      status: "pending",
      dueDate: "2026-06-01",
      completedDate: null,
      verificationData: null,
      notes: null,
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.report).toBeDefined();
    expect(body.report.deliverableId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(body.report.deliverableType).toBe("ad_read");
    expect(body.report.dealId).toBe("660e8400-e29b-41d4-a716-446655440001");
    expect(body.report.dealTitle).toBe("Acme Sponsorship");
    expect(body.report.checks).toHaveLength(3);
    expect(body.report.overallStatus).toBeDefined();
    expect(body.report.deadlineStatus).toBeDefined();
    expect(body.report.summary).toBeDefined();
  });

  it("returns verification report with explicit deliverableType", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Social Deal",
      title: "Generic Item",
      status: "pending",
      deliverableType: "social_mention",
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(body.report.deliverableType).toBe("social_mention");
  });

  it("returns pass for verified deliverable with verification data", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Verified Deal",
      title: "Link Placement",
      status: "verified",
      verificationData: {
        requiredUrl: "sponsor.com",
        foundUrl: "https://mysite.com/sponsor.com",
        contentPublished: true,
      },
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(body.report.overallStatus).toBe("pass");
    expect(body.report.deadlineStatus).toBe("completed");
  });

  it("returns fail for deliverable with failed checks", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Failing Deal",
      title: "Ad Read",
      status: "in_progress",
      verificationData: {
        adDurationSeconds: 10,
        requiredDurationSeconds: 30,
        sponsorMentioned: false,
      },
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const body = await response.json();
    expect(body.report.overallStatus).toBe("fail");
  });

  it("rejects invalid deliverableType enum", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Deal",
      title: "Item",
      status: "pending",
      deliverableType: "invalid_type",
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects missing required fields", async () => {
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  it("rejects invalid status enum", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Deal",
      title: "Item",
      status: "invalid_status",
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("accepts all valid status values", async () => {
    for (const status of ["pending", "in_progress", "submitted", "verified", "missed"]) {
      const payload = {
        deliverableId: "550e8400-e29b-41d4-a716-446655440000",
        dealId: "660e8400-e29b-41d4-a716-446655440001",
        dealTitle: "Deal",
        title: "Ad Read",
        status,
      };
      const request = new Request("http://localhost:3000/api/deliverables/verify", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.report).toBeDefined();
    }
  });

  it("accepts valid deliverableType values", async () => {
    for (const type of ["ad_read", "link_placement", "social_mention"]) {
      const payload = {
        deliverableId: "550e8400-e29b-41d4-a716-446655440000",
        dealId: "660e8400-e29b-41d4-a716-446655440001",
        dealTitle: "Deal",
        title: "Generic",
        status: "pending",
        deliverableType: type,
      };
      const request = new Request("http://localhost:3000/api/deliverables/verify", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.report.deliverableType).toBe(type);
    }
  });

  it("handles optional nullable fields as null", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Deal",
      title: "Ad Read",
      status: "pending",
      description: null,
      dueDate: null,
      completedDate: null,
      verificationData: null,
      notes: null,
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.report.deadlineStatus).toBe("no_deadline");
  });

  it("handles verificationData as object", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Deal",
      title: "Ad Read",
      status: "in_progress",
      verificationData: {
        episodePublished: true,
        episodeUrl: "https://podcast.com/ep1",
        adDurationSeconds: 45,
        sponsorMentioned: true,
      },
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.report.overallStatus).toBe("pass");
  });

  it("handles empty string dealTitle", async () => {
    const payload = {
      deliverableId: "550e8400-e29b-41d4-a716-446655440000",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "",
      title: "Ad Read",
      status: "pending",
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects non-UUID deliverableId", async () => {
    const payload = {
      deliverableId: "not-a-uuid",
      dealId: "660e8400-e29b-41d4-a716-446655440001",
      dealTitle: "Deal",
      title: "Ad Read",
      status: "pending",
    };
    const request = new Request("http://localhost:3000/api/deliverables/verify", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
