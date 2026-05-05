import { describe, it, expect, vi } from "vitest";
import { config } from "@/lib/config";

describe("config", () => {
  it("has app name SponsorSync", () => {
    expect(config.app.name).toBe("SponsorSync");
  });

  it("has app url from NEXTAUTH_URL or default", () => {
    expect(config.app.url).toBeDefined();
    expect(typeof config.app.url).toBe("string");
  });

  it("has database url", () => {
    expect(config.database.url).toBeDefined();
    expect(typeof config.database.url).toBe("string");
  });

  it("has auth secret", () => {
    expect(config.auth.secret).toBeDefined();
  });

  it("has auth url", () => {
    expect(config.auth.url).toBeDefined();
  });

  it("has email resendApiKey", () => {
    expect(config.email).toHaveProperty("resendApiKey");
  });

  it("has inngest eventKey and signingKey", () => {
    expect(config.inngest).toHaveProperty("eventKey");
    expect(config.inngest).toHaveProperty("signingKey");
  });

  it("defaults NEXTAUTH_URL to localhost when env var absent", () => {
    const originalEnv = process.env.NEXTAUTH_URL;
    delete process.env.NEXTAUTH_URL;
    vi.resetModules();

    return import("@/lib/config").then(({ config: freshConfig }) => {
      expect(freshConfig.app.url).toBe("http://localhost:3000");
      expect(freshConfig.auth.url).toBe("http://localhost:3000");
      process.env.NEXTAUTH_URL = originalEnv;
    });
  });

  it("uses NEXTAUTH_URL from env when set", async () => {
    const originalEnv = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = "https://custom.example.com";
    vi.resetModules();

    const { config: freshConfig } = await import("@/lib/config");
    expect(freshConfig.app.url).toBe("https://custom.example.com");
    expect(freshConfig.auth.url).toBe("https://custom.example.com");

    process.env.NEXTAUTH_URL = originalEnv;
  });

  it("defaults email resendApiKey to empty string when env var absent", async () => {
    const originalEnv = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    vi.resetModules();

    const { config: freshConfig } = await import("@/lib/config");
    expect(freshConfig.email.resendApiKey).toBe("");

    process.env.RESEND_API_KEY = originalEnv;
  });

  it("defaults inngest keys to empty strings when env vars absent", async () => {
    const origEvent = process.env.INNGEST_EVENT_KEY;
    const origSigning = process.env.INNGEST_SIGNING_KEY;
    delete process.env.INNGEST_EVENT_KEY;
    delete process.env.INNGEST_SIGNING_KEY;
    vi.resetModules();

    const { config: freshConfig } = await import("@/lib/config");
    expect(freshConfig.inngest.eventKey).toBe("");
    expect(freshConfig.inngest.signingKey).toBe("");

    process.env.INNGEST_EVENT_KEY = origEvent;
    process.env.INNGEST_SIGNING_KEY = origSigning;
  });
});
