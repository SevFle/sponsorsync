import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ templates: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ template: body }, { status: 201 });
}
