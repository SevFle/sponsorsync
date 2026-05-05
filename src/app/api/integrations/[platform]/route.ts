import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { platform: string } }
) {
  return NextResponse.json({ platform: params.platform, status: "disconnected" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { platform: string } }
) {
  return NextResponse.json({ disconnected: params.platform }, { status: 200 });
}
