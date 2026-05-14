"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { apiFetch } from "@/lib/api-client";

interface CreatedTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string | null;
}

export default function NewTemplatePage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: {
    name: string;
    subject: string;
    body: string;
    category: string;
  }) => {
    try {
      setSaving(true);
      setError(null);
      const result = await apiFetch<{ template: CreatedTemplate }>("/api/templates", {
        method: "POST",
        body: JSON.stringify(data),
      });
      router.push(`/dashboard/templates/${result.template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  if (sessionStatus !== "authenticated") return null;

  return (
    <div>
      <PageHeader
        title="New Template"
        description="Create a new email template for sponsor communication."
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6">
        <TemplateEditor
          onSave={handleSave}
          onCancel={() => router.push("/dashboard/templates")}
          saving={saving}
        />
      </div>
    </div>
  );
}
