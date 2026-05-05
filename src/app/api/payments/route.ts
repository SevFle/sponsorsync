import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ payments: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ payment: body }, { status: 201 });
}
