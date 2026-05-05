import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ deliverables: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ deliverable: body }, { status: 201 });
}
