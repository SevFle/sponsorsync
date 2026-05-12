import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getIntegrationByPlatform, deleteIntegration } from "@/lib/db/queries/integrations";
import { z } from "zod";

const allowedPlatforms = ["buzzsprout", "transistor", "anchor", "convertkit", "mailchimp"] as const;
const platformParamSchema = z.enum(allowedPlatforms);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  const platformResult = platformParamSchema.safeParse(platform);
  if (!platformResult.success) {
    return NextResponse.json(
      { error: "Invalid platform parameter", details: platformResult.error.flatten() },
      { status: 400 }
    );
  }

  const validatedPlatform = platformResult.data;
  const userId = session.user.id;
  const integration = await getIntegrationByPlatform(validatedPlatform, userId);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }
  return NextResponse.json({ integration });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  const platformResult = platformParamSchema.safeParse(platform);
  if (!platformResult.success) {
    return NextResponse.json(
      { error: "Invalid platform parameter", details: platformResult.error.flatten() },
      { status: 400 }
    );
  }

  const validatedPlatform = platformResult.data;
  const userId = session.user.id;
  const integration = await deleteIntegration(validatedPlatform, userId);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }
  return NextResponse.json({ disconnected: validatedPlatform }, { status: 200 });
}
