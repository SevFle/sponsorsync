import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getAllRules } from "@/lib/deliverables/rules";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = getAllRules();

  return NextResponse.json({
    rules: rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      deliverableType: rule.deliverableType,
    })),
    totalRules: rules.length,
    deliverableTypes: ["ad_read", "link_placement", "social_mention"],
  });
}
