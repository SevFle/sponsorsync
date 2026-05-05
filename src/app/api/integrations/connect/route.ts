import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { apiKey: _apiKey, ...safeBody } = body;
  return NextResponse.json({ connected: true, ...safeBody }, { status: 201 });
}
