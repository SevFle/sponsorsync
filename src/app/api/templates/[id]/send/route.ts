import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getTemplateById } from "@/lib/db/queries/templates";
import { sendTemplateEmail, checkRateLimit } from "@/lib/email/emailService";
import { extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";
import { createCommunication } from "@/lib/db/queries/communications";
import { sendTemplateSchema } from "@/domain/templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendTemplateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorParts: string[] = [];
    if (fieldErrors.to) {
      errorParts.push("Recipient is required");
    }
    const errorMessage = errorParts.length > 0 ? errorParts.join(", ") : "Validation failed";
    return NextResponse.json(
      {
        error: errorMessage,
        details: fieldErrors,
      },
      { status: 422 }
    );
  }

  const rateLimit = checkRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 50 emails per hour." },
      { status: 429 }
    );
  }

  try {
    const template = await getTemplateById(id, session.user.id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const context: VariableContext = {
      userId: session.user.id,
      sponsorId: parsed.data.sponsorId,
      dealId: parsed.data.dealId,
      deliverableId: parsed.data.deliverableId,
      paymentId: parsed.data.paymentId,
    };
    const resolved = await resolveVariables(context);
    const resolvedVars = { ...resolved.variables, ...(parsed.data.variables ?? {}) };

    const requiredVars = extractVariablesFromTemplate(template.subject, template.body);
    const missing = requiredVars.filter((key) => !resolvedVars[key]);

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required variables: ${missing.join(", ")}` },
        { status: 422 }
      );
    }

    const result = await sendTemplateEmail({
      subject: template.subject ?? "",
      body: template.body,
      to: parsed.data.to,
      cc: parsed.data.cc,
      bcc: parsed.data.bcc,
      replyTo: parsed.data.replyTo,
      variables: resolvedVars,
    });

    const recipientList = Array.isArray(parsed.data.to) ? parsed.data.to : [parsed.data.to];
    for (const recipient of recipientList) {
      await createCommunication({
        userId: session.user.id,
        sponsorId: parsed.data.sponsorId ?? null,
        sponsorContactId: null,
        templateId: id,
        dealId: parsed.data.dealId ?? null,
        subject: template.subject ?? "",
        body: template.body,
        status: "sent",
        providerId: result.id,
        to: recipient,
        cc:
          typeof parsed.data.cc === "string"
            ? parsed.data.cc
            : Array.isArray(parsed.data.cc)
              ? parsed.data.cc.join(",")
              : null,
        bcc:
          typeof parsed.data.bcc === "string"
            ? parsed.data.bcc
            : Array.isArray(parsed.data.bcc)
              ? parsed.data.bcc.join(",")
              : null,
      });
    }

    return NextResponse.json({
      id: result.id,
      rateLimit: { remaining: rateLimit.remaining },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
