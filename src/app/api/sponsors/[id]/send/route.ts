import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getSponsorById } from "@/lib/db/queries/sponsors";
import { getContactById } from "@/lib/db/queries/contacts";
import { getTemplateById } from "@/lib/db/queries/templates";
import { sendTemplateEmail, checkRateLimit, previewTemplateEmail } from "@/lib/email/emailService";
import { extractVariablesFromTemplate } from "@/lib/templates/templateEngine";
import { resolveVariables, type VariableContext } from "@/lib/templates/variableResolver";
import { createCommunication } from "@/lib/db/queries/communications";
import { z } from "zod";

const idParamSchema = z.string().uuid();

const sendSchema = z.object({
  templateId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  to: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  replyTo: z.union([z.string(), z.array(z.string())]).optional(),
  sponsorId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  deliverableId: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
  preview: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const idResult = idParamSchema.safeParse(id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: "Invalid sponsor id", details: idResult.error.flatten() },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const userId = session.user.id;
  const sponsor = await getSponsorById(id, userId);
  if (!sponsor) {
    return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
  }

  const effectiveSponsorId = parsed.data.sponsorId ?? id;

  let recipientEmail: string | string[];
  let contactId: string | undefined = parsed.data.contactId;

  if (contactId) {
    const contact = await getContactById(contactId, effectiveSponsorId);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    recipientEmail = contact.email;
  } else if (parsed.data.to) {
    recipientEmail = parsed.data.to;
  } else {
    return NextResponse.json(
      { error: "Either contactId or to is required" },
      { status: 422 }
    );
  }

  const template = await getTemplateById(parsed.data.templateId, userId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let resolvedVars: Record<string, string> = {};

  const context: VariableContext = {
    userId,
    sponsorId: effectiveSponsorId,
    dealId: parsed.data.dealId,
    deliverableId: parsed.data.deliverableId,
  };
  const dbVars = await resolveVariables(context);
  resolvedVars = { ...dbVars.variables };

  const userOverrides = parsed.data.variables ?? {};
  resolvedVars = { ...resolvedVars, ...userOverrides };

  const requiredVars = extractVariablesFromTemplate(template.subject, template.body);
  const missing = requiredVars.filter((v) => !resolvedVars[v]);

  if (parsed.data.preview) {
    for (const key of missing) {
      resolvedVars[key] = `[${key}]`;
    }
    const rendered = previewTemplateEmail({
      subject: template.subject ?? "",
      body: template.body,
      variables: resolvedVars,
    });
    return NextResponse.json({
      preview: { html: rendered.html, text: rendered.text, subject: rendered.subject },
    });
  }

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required variables: ${missing.join(", ")}` },
      { status: 422 }
    );
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum 50 emails per hour." },
      { status: 429 }
    );
  }

  try {
    const result = await sendTemplateEmail({
      subject: template.subject ?? "",
      body: template.body,
      to: recipientEmail,
      cc: parsed.data.cc,
      bcc: parsed.data.bcc,
      replyTo: parsed.data.replyTo,
      variables: resolvedVars,
    });

    const recipientList = Array.isArray(recipientEmail) ? recipientEmail : [recipientEmail];

    for (const recipient of recipientList) {
      await createCommunication({
        userId,
        sponsorId: effectiveSponsorId,
        sponsorContactId: contactId ?? null,
        templateId: parsed.data.templateId,
        dealId: parsed.data.dealId ?? null,
        subject: template.subject ?? "",
        body: template.body,
        status: "sent",
        providerId: result.id,
        to: recipient,
        cc: typeof parsed.data.cc === "string" ? parsed.data.cc : Array.isArray(parsed.data.cc) ? parsed.data.cc.join(",") : null,
        bcc: typeof parsed.data.bcc === "string" ? parsed.data.bcc : Array.isArray(parsed.data.bcc) ? parsed.data.bcc.join(",") : null,
      });
    }

    return NextResponse.json({
      id: result.id,
      rateLimit: { remaining: rateLimit.remaining },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";

    if (contactId && effectiveSponsorId) {
      const recipientList = Array.isArray(recipientEmail) ? recipientEmail : [recipientEmail];
      for (const recipient of recipientList) {
        await createCommunication({
          userId,
          sponsorId: effectiveSponsorId,
          sponsorContactId: contactId,
          templateId: parsed.data.templateId,
          dealId: parsed.data.dealId ?? null,
          subject: template.subject ?? "",
          body: template.body,
          status: "failed",
          providerId: null,
          to: recipient,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
