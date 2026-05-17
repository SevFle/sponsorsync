import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getAllRules } from "@/lib/deliverables/rules";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
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
