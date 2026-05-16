import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getTemplateById, createTemplate } from "@/lib/db/queries/templates";
import { duplicateTemplateSchema } from "@/domain/templates";

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
    body = {};
  }

  const parsed = duplicateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  try {
    const source = await getTemplateById(id, session.user.id);
    if (!source) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const duplicated = await createTemplate({
      userId: session.user.id,
      name: parsed.data.name ?? `${source.name} (Copy)`,
      subject: source.subject,
      body: source.body,
      category: source.category,
      isDefault: false,
    });

    return NextResponse.json({ template: duplicated }, { status: 201 });
  } catch (error) {
    console.error("Failed to duplicate template:", error);
    return NextResponse.json({ error: "Failed to duplicate template" }, { status: 500 });
  }
}
