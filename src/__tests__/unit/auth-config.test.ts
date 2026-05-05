import { describe, it, expect } from "vitest";
import { authOptions } from "@/lib/auth/config";

const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

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
  });
});
