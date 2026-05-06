import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ payment: { id: (await params).id } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  return NextResponse.json({ payment: { id: (await params).id, ...body } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({ deleted: true }, { status: 200 });
}
