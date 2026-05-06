import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SponsorSync//EN",
    "BEGIN:VEVENT",
    `UID:${(await params).token}@sponsorsync.app`,
    "SUMMARY:SponsorSync Deliverables",
    "DESCRIPTION:Your upcoming sponsorship deliverables",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sponsorsync-${(await params).token}.ics"`,
    },
  });
}
