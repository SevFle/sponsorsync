import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getTemplateById } from "@/lib/db/queries/templates";
import { previewTemplateEmail } from "@/lib/email/emailService";
import { extractVariablesFromTemplate, TEMPLATE_VARIABLES } from "@/lib/templates/templateEngine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const data = (body as Record<string, unknown>) ?? {};
  const variables = (data.variables as Record<string, string>) ?? {};

  try {
    const template = await getTemplateById(id, session.user.id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const templateVars = extractVariablesFromTemplate(template.subject, template.body);
    const previewVars: Record<string, string> = {};
    for (const key of templateVars) {
      const info = TEMPLATE_VARIABLES.find((v) => v.key === key);
      previewVars[key] = variables[key] ?? info?.label ?? `[${key}]`;
    }

    const rendered = previewTemplateEmail({
      subject: template.subject ?? "",
      body: template.body,
      variables: previewVars,
    });

    return NextResponse.json({
      preview: {
        html: rendered.html,
        text: rendered.text,
        subject: rendered.subject,
      },
    });
  } catch (error) {
    console.error("Failed to preview template:", error);
    return NextResponse.json({ error: "Failed to preview template" }, { status: 500 });
  }
}
