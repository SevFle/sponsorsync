import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getPaymentsByUserId, createPayment } from "@/lib/db/queries/payments";
import { getDealsByUserId } from "@/lib/db/queries/deals";
import { getDealById } from "@/lib/db/queries/deals";
import { getSponsorsByUserId } from "@/lib/db/queries/sponsors";
import { createPaymentSchema } from "@/domain/payments";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const [payments, userDeals, userSponsors] = await Promise.all([
      getPaymentsByUserId(userId),
      getDealsByUserId(userId),
      getSponsorsByUserId(userId),
    ]);

    const dealMap = new Map(userDeals.map((d) => [d.id, d]));
    const sponsorMap = new Map(userSponsors.map((s) => [s.id, s]));

    const enrichedPayments = payments.map((payment) => {
      const deal = dealMap.get(payment.dealId);
      const sponsor = deal ? sponsorMap.get(deal.sponsorId) : undefined;

      return {
        id: payment.id,
        dealId: payment.dealId,
        amount: payment.amount,
        currency: payment.currency ?? "USD",
        status: payment.status,
        dueDate: payment.dueDate,
        paidDate: payment.paidDate,
        invoiceUrl: payment.invoiceUrl,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        dealTitle: deal?.title ?? "Unknown Deal",
        sponsorName: sponsor?.name ?? "Unknown",
      };
    });

    return NextResponse.json({ payments: enrichedPayments });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const userId = session.user.id;
    const deal = await getDealById(parsed.data.dealId, userId);
    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found or access denied" },
        { status: 404 }
      );
    }

    const payment = await createPayment({
      dealId: parsed.data.dealId,
      amount: parsed.data.amount,
      currency: parsed.data.currency ?? "USD",
      dueDate: parsed.data.dueDate ?? null,
      status: "pending",
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
