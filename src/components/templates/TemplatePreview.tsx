"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-client";

interface TemplatePreviewProps {
  templateId: string;
  variables?: Record<string, string>;
}

interface PreviewData {
  html: string;
  text: string;
  subject: string;
}

export function TemplatePreview({ templateId, variables }: TemplatePreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<{ preview: PreviewData }>(
        `/api/templates/${templateId}/preview`,
        {
          method: "POST",
          body: JSON.stringify({ variables: variables ?? {} }),
        }
      );
      setPreview(data.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }, [templateId, variables]);

  useEffect(() => {
    if (!templateId) return;
    fetchPreview();
  }, [templateId, fetchPreview]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">Preview</h3>
        <p className="text-xs text-gray-500 mt-0.5">Subject: {preview.subject}</p>
      </div>
      <div className="p-4">
        <iframe
          srcDoc={preview.html}
          title="Email Preview"
          className="w-full border-0 rounded bg-gray-50"
          style={{ height: "500px" }}
          sandbox="allow-same-origin"
        />
      </div>
      <details className="border-t border-gray-200">
        <summary className="cursor-pointer px-4 py-2 text-xs text-gray-500 hover:bg-gray-50">
          Plain Text Version
        </summary>
        <pre className="whitespace-pre-wrap px-4 py-3 text-xs text-gray-700 bg-gray-50 max-h-64 overflow-auto">
          {preview.text}
        </pre>
      </details>
    </div>
  );
}
