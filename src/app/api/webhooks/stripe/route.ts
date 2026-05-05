import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 401 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && signature !== webhookSecret) {
    return NextResponse.json(
      { error: "Invalid stripe-signature" },
      { status: 401 }
    );
  }

  const body = await request.json();
  return NextResponse.json({ received: true });
}
