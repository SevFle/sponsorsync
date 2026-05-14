import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getTemplateById } from "@/lib/db/queries/templates";
import { sendTemplateEmail, checkRateLimit } from "@/lib/email/emailService";
import { interpolateTemplate, validateVariables, extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rateLimit = checkRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 50 emails per hour." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  if (!data.to || (typeof data.to !== "string" && !Array.isArray(data.to))) {
    return NextResponse.json({ error: "Recipient 'to' is required" }, { status: 422 });
  }

  try {
    const template = await getTemplateById(id, session.user.id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const userOverrides = (data.variables as Record<string, string>) ?? {};
    const resolvedVars = userOverrides;

    const requiredVars = extractVariablesFromTemplate(template.subject, template.body);
    const missing = requiredVars.filter((v) => !resolvedVars[v]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required variables: ${missing.join(", ")}` },
        { status: 422 }
      );
    }

    const result = await sendTemplateEmail({
      subject: template.subject ?? "",
      body: template.body,
      to: data.to as string | string[],
      cc: data.cc as string | string[] | undefined,
      bcc: data.bcc as string | string[] | undefined,
      replyTo: data.replyTo as string | string[] | undefined,
      variables: resolvedVars,
    });

    return NextResponse.json({ id: result.id, rateLimit: { remaining: rateLimit.remaining } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
