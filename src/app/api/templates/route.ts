import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/guard";
import { getTemplatesByUserIdFiltered, createTemplate } from "@/lib/db/queries/templates";
import { DEFAULT_TEMPLATES } from "@/lib/templates/templateDefaults";

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  try {
    const templates = await getTemplatesByUserIdFiltered(session.user.id, { search, category });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body as Record<string, unknown>).name;
  if (!body || typeof body !== "object" || !("name" in body) || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 422 });
  }

  const data = body as Record<string, unknown>;

  if ("body" in data && typeof data.body !== "string") {
    return NextResponse.json({ error: "Body must be a string" }, { status: 422 });
  }

  try {
    const template = await createTemplate({
      userId: session.user.id,
      name: (data.name as string).trim(),
      subject: typeof data.subject === "string" ? data.subject : null,
      body: typeof data.body === "string" ? data.body : "",
      category: typeof data.category === "string" ? data.category : null,
      isDefault: false,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
