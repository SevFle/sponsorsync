import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SponsorSync//EN",
    "BEGIN:VEVENT",
    `UID:${params.token}@sponsorsync.app`,
    "SUMMARY:SponsorSync Deliverables",
    "DESCRIPTION:Your upcoming sponsorship deliverables",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sponsorsync-${params.token}.ics"`,
    },
  });
}
