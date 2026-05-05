import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ deals: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ deal: body }, { status: 201 });
}
