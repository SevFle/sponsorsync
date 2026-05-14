"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { apiFetch } from "@/lib/api-client";

interface TemplateData {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  category: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplateDetailPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ template: TemplateData }>(`/api/templates/${templateId}`);
      setTemplate(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    fetchTemplate();
  }, [fetchTemplate, sessionStatus]);

  const handleSave = async (data: {
    name: string;
    subject: string;
    body: string;
    category: string;
  }) => {
    try {
      setSaving(true);
      const result = await apiFetch<{ template: TemplateData }>(
        `/api/templates/${templateId}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      setTemplate(result.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/api/templates/${templateId}`, { method: "DELETE" });
      router.push("/dashboard/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };

  if (sessionStatus !== "authenticated") return null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-64 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error && !template) {
    return (
      <div>
        <PageHeader title="Error" />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={fetchTemplate}
            className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div>
      <PageHeader
        title={template.name}
        description={template.isDefault ? "Default template" : "Custom template"}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>
            {!template.isDefault && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className={`mt-6 grid gap-6 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <TemplateEditor
            initialData={{
              name: template.name,
              subject: template.subject ?? "",
              body: template.body,
              category: template.category ?? "",
            }}
            onSave={handleSave}
            onCancel={() => router.push("/dashboard/templates")}
            saving={saving}
          />
        </div>
        {showPreview && (
          <div>
            <TemplatePreview templateId={templateId} />
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-xl max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Template</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &quot;{template.name}&quot;? This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
