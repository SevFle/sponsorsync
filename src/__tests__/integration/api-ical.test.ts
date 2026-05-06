import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/ical/[token]/route";

describe("GET /api/ical/[token]", () => {
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

  it("includes token in VEVENT UID", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/my-token"),
      { params: Promise.resolve({ token: "my-token" }) }
    );
    const text = await response.text();

    expect(text).toContain("UID:my-token@sponsorsync.app");
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

  it("sets Content-Disposition header with filename including token", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/ical/abc-def"),
      { params: Promise.resolve({ token: "abc-def" }) }
    );

    const disposition = response.headers.get("Content-Disposition");
    expect(disposition).toBe('attachment; filename="sponsorsync-abc-def.ics"');
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

    expect(text).toContain("UID:user-123_abc@sponsorsync.app");
    expect(response.headers.get("Content-Disposition")).toContain("user-123_abc");
  });
});
