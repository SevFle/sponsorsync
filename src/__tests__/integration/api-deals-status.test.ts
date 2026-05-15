import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "@/app/api/deals/[id]/status/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/queries/deals", () => ({
  getDealById: vi.fn(),
  updateDealStatus: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getDealById, updateDealStatus } from "@/lib/db/queries/deals";

const mockSession = { user: { id: "user-1", email: "test@test.com" } };

function mockAuth(session: typeof mockSession | null) {
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(session);
}

const UUID = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(mockSession);
});

describe("PATCH /api/deals/[id]/status", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when session user has no id", async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { email: "test@test.com" },
    });
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid UUID id", async () => {
    const request = new Request("http://localhost:3000/api/deals/not-a-uuid/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid id parameter");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 422 for invalid status value", async () => {
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "invalid" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 for missing status in body", async () => {
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(422);
  });

  it("returns 404 when deal not found", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Deal not found");
  });

  it("returns 422 for invalid transition draft → active", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "draft",
    });
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("Invalid status transition");
    expect(body.error).toContain("draft");
    expect(body.error).toContain("active");
  });

  it("returns 422 for invalid transition active → draft", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "active",
    });
    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });
    expect(response.status).toBe(422);
  });

  it("successfully transitions draft → proposed", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "draft",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "proposed",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deal.status).toBe("proposed");
    expect(updateDealStatus).toHaveBeenCalledWith(UUID, "proposed", "user-1");
  });

  it("successfully transitions proposed → active", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "proposed",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "active",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deal.status).toBe("active");
  });

  it("successfully transitions active → completed", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "active",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "completed",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(response.status).toBe(200);
    expect(updateDealStatus).toHaveBeenCalledWith(UUID, "completed", "user-1");
  });

  it("successfully transitions completed → active (reopen)", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "completed",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "active",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(response.status).toBe(200);
  });

  it("successfully transitions cancelled → draft (restart)", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "cancelled",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "draft",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "draft" }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(response.status).toBe(200);
  });

  it("scopes deal lookup to authenticated user", async () => {
    (getDealById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "draft",
    });
    (updateDealStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: UUID,
      status: "proposed",
    });

    const request = new Request(`http://localhost:3000/api/deals/${UUID}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "proposed" }),
      headers: { "Content-Type": "application/json" },
    });
    await PATCH(request, {
      params: Promise.resolve({ id: UUID }),
    });

    expect(getDealById).toHaveBeenCalledWith(UUID, "user-1");
  });
});
