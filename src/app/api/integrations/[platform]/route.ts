import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  return NextResponse.json({ platform: (await params).platform, status: "disconnected" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  return NextResponse.json({ disconnected: (await params).platform }, { status: 200 });
}
