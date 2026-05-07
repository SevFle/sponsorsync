import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLimit, mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mLimit = vi.fn();
  const mWhere = vi.fn(() => ({ limit: mLimit }));
  const mFrom = vi.fn(() => ({ where: mWhere }));
  const mSelect = vi.fn(() => ({ from: mFrom }));
  return { mockLimit: mLimit, mockWhere: mWhere, mockFrom: mFrom, mockSelect: mSelect };
});

vi.mock("@/lib/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/lib/db/schema", () => ({
  users: { id: "id", email: "email", name: "name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { authOptions } from "@/lib/auth/config";

const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authOptions structure", () => {
  it("has jwt session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("has login page configured", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  it("has secret configured", () => {
    expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
  });

  it("has two providers", () => {
    expect(authOptions.providers).toHaveLength(2);
  });
});

describe("authOptions callbacks", () => {
  describe("jwt callback", () => {
    it("adds user id to token when user is present", async () => {
      const result = await jwtCallback({
        token: {} as any,
        user: { id: "user-123" } as any,
        account: null,
      });
      expect((result as any).id).toBe("user-123");
    });

    it("returns token unchanged when no user", async () => {
      const result = await jwtCallback({
        token: { existing: "value" } as any,
        user: undefined as any,
        account: null,
      });
      expect((result as any).existing).toBe("value");
      expect((result as any).id).toBeUndefined();
    });

    it("preserves existing token properties when adding user id", async () => {
      const result = await jwtCallback({
        token: { email: "test@test.com" } as any,
        user: { id: "user-1" } as any,
        account: null,
      });
      expect((result as any).email).toBe("test@test.com");
      expect((result as any).id).toBe("user-1");
    });
  });

  describe("session callback", () => {
    it("adds token id to session user", async () => {
      const result = await sessionCallback({
        session: {
          user: { name: "Test", email: "test@test.com" },
        },
        token: { id: "user-456" },
        user: {},
      } as any);
      expect((result as any).user.id).toBe("user-456");
    });

    it("returns session unchanged when token has no id", async () => {
      const result = await sessionCallback({
        session: {
          user: { name: "Test", email: "test@test.com" },
        },
        token: {},
        user: {},
      } as any);
      expect((result as any).user.id).toBeUndefined();
    });

    it("preserves existing session user properties", async () => {
      const result = await sessionCallback({
        session: {
          user: { name: "Test", email: "test@test.com" },
        },
        token: { id: "user-1" },
        user: {},
      } as any);
      expect((result as any).user.name).toBe("Test");
      expect((result as any).user.email).toBe("test@test.com");
      expect((result as any).user.id).toBe("user-1");
    });
  });
});

describe("CredentialsProvider authorize", () => {
  async function callAuthorize(credentials: Record<string, string> | undefined) {
    const credentialsProvider = authOptions.providers.find(
      (p: any) => p.type === "credentials"
    ) as any;
    return credentialsProvider.options.authorize(credentials);
  }

  it("returns null when no credentials provided", async () => {
    const result = await callAuthorize(undefined);
    expect(result).toBeNull();
  });

  it("returns null when no email in credentials", async () => {
    const result = await callAuthorize({});
    expect(result).toBeNull();
  });

  it("returns user object when user found in database", async () => {
    const dbUser = { id: "user-1", email: "test@test.com", name: "Test User" };
    mockLimit.mockResolvedValue([dbUser]);
    const result = await callAuthorize({ email: "test@test.com" });
    expect(result).toEqual({ id: "user-1", email: "test@test.com", name: "Test User" });
  });

  it("returns null when user not found in database", async () => {
    mockLimit.mockResolvedValue([]);
    const result = await callAuthorize({ email: "notfound@test.com" });
    expect(result).toBeNull();
  });

  it("queries database with the provided email", async () => {
    mockLimit.mockResolvedValue([]);
    await callAuthorize({ email: "specific@test.com" });
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});
