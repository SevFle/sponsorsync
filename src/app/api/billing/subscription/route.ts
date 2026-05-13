import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getUserWithBilling } from "@/lib/db/queries/billing";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await getUserWithBilling(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      subscription: {
        status: user.subscriptionStatus,
        planId: user.stripePriceId,
        currentPeriodStart: user.currentPeriodStart,
        currentPeriodEnd: user.currentPeriodEnd,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
