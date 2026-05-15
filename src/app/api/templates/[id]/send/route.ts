import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getTemplateById } from "@/lib/db/queries/templates";
import { sendTemplateEmail, checkRateLimit } from "@/lib/email/emailService";
import { extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";
import { createCommunication } from "@/lib/db/queries/communications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
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

    let resolvedVars: Record<string, string> = {};

    const sponsorId = typeof data.sponsorId === "string" ? data.sponsorId : undefined;
    const dealId = typeof data.dealId === "string" ? data.dealId : undefined;
    const deliverableId = typeof data.deliverableId === "string" ? data.deliverableId : undefined;

    if (sponsorId || dealId || deliverableId) {
      const context: VariableContext = {
        userId: session.user.id,
        sponsorId,
        dealId,
        deliverableId,
      };
      const dbVars = await resolveVariables(context);
      resolvedVars = { ...dbVars.variables };
    }

    const userOverrides = (data.variables as Record<string, string>) ?? {};
    resolvedVars = { ...resolvedVars, ...userOverrides };

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

    const recipientList = Array.isArray(data.to) ? data.to : [data.to];

    for (const recipient of recipientList) {
      await createCommunication({
        userId: session.user.id,
        sponsorId: sponsorId ?? null,
        sponsorContactId: typeof data.sponsorContactId === "string" ? data.sponsorContactId : null,
        templateId: id,
        dealId: dealId ?? null,
        subject: template.subject ?? "",
        body: template.body,
        status: "sent",
        providerId: result.id,
        to: recipient,
        cc: typeof data.cc === "string" ? data.cc : Array.isArray(data.cc) ? data.cc.join(",") : null,
        bcc: typeof data.bcc === "string" ? data.bcc : Array.isArray(data.bcc) ? data.bcc.join(",") : null,
      });
    }

    return NextResponse.json({ id: result.id, rateLimit: { remaining: rateLimit.remaining } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
