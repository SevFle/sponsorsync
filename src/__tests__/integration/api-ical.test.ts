import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/security/ical-token", () => ({
  validateIcalToken: vi.fn().mockReturnValue("user-123"),
}));

import { GET } from "@/app/api/ical/[token]/route";
import { validateIcalToken } from "@/lib/security/ical-token";

describe("GET /api/ical/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateIcalToken as ReturnType<typeof vi.fn>).mockReturnValue("user-123");
  });

  it("returns valid iCalendar content", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/abc123"),
      { params: Promise.resolve({ token: "abc123" }) }
    );

    expect(response.status).toBe(200);
    const text = await response.text();

    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("VERSION:2.0");
    expect(text).toContain("END:VCALENDAR");
  });

  it("includes correct PRODID", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/test-token"),
      { params: Promise.resolve({ token: "test-token" }) }
    );
    const text = await response.text();

    expect(text).toContain("PRODID:-//SponsorSync//EN");
  });

  it("includes userId from validated token in VEVENT UID", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/my-token"),
      { params: Promise.resolve({ token: "my-token" }) }
    );
    const text = await response.text();

    expect(text).toContain("UID:user-123@sponsorsync.app");
  });

  it("includes VEVENT structure", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );
    const text = await response.text();

    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain("END:VEVENT");
    expect(text).toContain("SUMMARY:SponsorSync Deliverables");
    expect(text).toContain("DESCRIPTION:Your upcoming sponsorship deliverables");
  });

  it("sets correct Content-Type header", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );

    expect(response.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
  });

  it("sets Content-Disposition header with filename", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/abc-def"),
      { params: Promise.resolve({ token: "abc-def" }) }
    );

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".ics");
  });

  it("uses CRLF line endings per iCal spec", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/tok"),
      { params: Promise.resolve({ token: "tok" }) }
    );
    const text = await response.text();

    expect(text).toContain("\r\n");
  });

  it("handles special characters in token", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/user-123_abc"),
      { params: Promise.resolve({ token: "user-123_abc" }) }
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("BEGIN:VCALENDAR");
  });

  it("calls validateIcalToken with the provided token", async () => {
    await GET(
      new Request("http://localhost:3000/api/ical/my-test-token"),
      { params: Promise.resolve({ token: "my-test-token" }) }
    );

    expect(validateIcalToken).toHaveBeenCalledWith("my-test-token");
  });
});

describe("GET /api/ical/[token] - invalid token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (validateIcalToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it("returns 401 for invalid token", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/invalid-token"),
      { params: Promise.resolve({ token: "invalid-token" }) }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Invalid token");
  });

  it("returns 401 for empty token", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/"),
      { params: Promise.resolve({ token: "" }) }
    );

    expect(response.status).toBe(401);
  });

  it("does not return calendar content for invalid tokens", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/fake"),
      { params: Promise.resolve({ token: "fake" }) }
    );

    const text = await response.text();
    expect(text).not.toContain("BEGIN:VCALENDAR");
  });
});
