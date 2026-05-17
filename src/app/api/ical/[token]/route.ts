import { NextResponse } from "next/server";
import { validateIcalToken } from "@/lib/security/ical-token";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const userId = validateIcalToken(token);

  if (!userId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SponsorSync//EN",
    "BEGIN:VEVENT",
    `UID:${userId}@sponsorsync.app`,
    "SUMMARY:SponsorSync Deliverables",
    "DESCRIPTION:Your upcoming sponsorship deliverables",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="sponsorsync-${token.substring(0, 8)}.ics"`,
    },
  });
}
