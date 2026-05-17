import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...originalEnv, NEXTAUTH_SECRET: "test-secret-for-ical-tokens" };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("generateIcalToken and validateIcalToken", () => {
  it("generates a token that can be validated", async () => {
    const { generateIcalToken, validateIcalToken } = await import("@/lib/security/ical-token");
    const token = generateIcalToken("user-abc-123");
    const userId = validateIcalToken(token);
    expect(userId).toBe("user-abc-123");
  });

  it("returns null for invalid token format", async () => {
    const { validateIcalToken } = await import("@/lib/security/ical-token");
    expect(validateIcalToken("no-dot-token")).toBeNull();
  });

  it("returns null for token with wrong signature", async () => {
    const { generateIcalToken, validateIcalToken } = await import("@/lib/security/ical-token");
    const token = generateIcalToken("user-123");
    const tampered = token + "x";
    expect(validateIcalToken(tampered)).toBeNull();
  });

  it("returns null for empty token", async () => {
    const { validateIcalToken } = await import("@/lib/security/ical-token");
    expect(validateIcalToken("")).toBeNull();
  });

  it("returns null when NEXTAUTH_SECRET is not set", async () => {
    delete process.env.NEXTAUTH_SECRET;
    const { validateIcalToken } = await import("@/lib/security/ical-token");
    expect(validateIcalToken("dXNlcg.wrong")).toBeNull();
  });

  it("generates different tokens for different users", async () => {
    const { generateIcalToken } = await import("@/lib/security/ical-token");
    const token1 = generateIcalToken("user-1");
    const token2 = generateIcalToken("user-2");
    expect(token1).not.toBe(token2);
  });

  it("generates same token for same user consistently", async () => {
    const { generateIcalToken } = await import("@/lib/security/ical-token");
    const token1 = generateIcalToken("user-1");
    const token2 = generateIcalToken("user-1");
    expect(token1).toBe(token2);
  });

  it("rejects token with valid format but wrong secret", async () => {
    const { generateIcalToken } = await import("@/lib/security/ical-token");
    const token = generateIcalToken("user-1");

    process.env.NEXTAUTH_SECRET = "different-secret";
    const { validateIcalToken } = await import("@/lib/security/ical-token");
    expect(validateIcalToken(token)).toBeNull();
  });

  it("handles UUID user IDs", async () => {
    const { generateIcalToken, validateIcalToken } = await import("@/lib/security/ical-token");
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const token = generateIcalToken(userId);
    expect(validateIcalToken(token)).toBe(userId);
  });

  it("returns null for token with empty userId", async () => {
    const { validateIcalToken } = await import("@/lib/security/ical-token");
    const fakeToken = ".c29tZXNpZw";
    expect(validateIcalToken(fakeToken)).toBeNull();
  });
});
