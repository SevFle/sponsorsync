"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiError } from "@/lib/api-client";

interface TemplateOption {
  id: string;
  name: string;
  subject: string | null;
  category: string | null;
}

interface ContactOption {
  id: string;
  name: string;
  email: string;
  isPrimary: boolean;
}

interface ComposeMessageProps {
  sponsorId: string;
  contacts: ContactOption[];
  onSent: () => void;
  onCancel: () => void;
}

export function ComposeMessage({
  sponsorId,
  contacts,
  onSent,
  onCancel,
}: ComposeMessageProps) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    async function loadTemplates() {
      try {
        const data = await apiFetch<{ templates?: TemplateOption[] }>("/api/templates");
        setTemplates(data.templates ?? []);
      } catch {
        // ignore
      }
    }
    loadTemplates();
  }, []);

  const loadPreview = useCallback(async () => {
    if (!selectedTemplateId) return;
    setLoadingPreview(true);
    try {
      const data = await apiFetch<{ preview?: { html: string; subject: string } }>(
        `/api/sponsors/${sponsorId}/send`,
        {
          method: "POST",
          body: JSON.stringify({
            templateId: selectedTemplateId,
            contactId: selectedContactId || undefined,
            to: !selectedContactId && customTo ? customTo : undefined,
            sponsorId,
            preview: true,
          }),
        }
      );
      if (data.preview) {
        setPreview({ html: data.preview.html, subject: data.preview.subject });
      }
    } catch {
      // ignore
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedTemplateId, selectedContactId, customTo, sponsorId]);

  async function handleSend() {
    if (!selectedTemplateId) {
      setError("Please select a template");
      return;
    }
    if (!selectedContactId && !customTo) {
      setError("Please select a contact or enter an email address");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const data = await apiFetch<{ id?: string; error?: string }>(
        `/api/sponsors/${sponsorId}/send`,
        {
          method: "POST",
          body: JSON.stringify({
            templateId: selectedTemplateId,
            contactId: selectedContactId || undefined,
            to: !selectedContactId && customTo ? customTo : undefined,
            sponsorId,
          }),
        }
      );

      if (data.error) {
        setError(data.error);
        return;
      }

      onSent();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const primaryContact = contacts.find((c) => c.isPrimary);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Compose Message</h2>
        <p className="text-sm text-gray-500">
          Send a templated email to this sponsor.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">
            Template *
          </label>
          <select
            id="template-select"
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              setPreview(null);
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contact-select" className="block text-sm font-medium text-gray-700">
            Recipient
          </label>
          {contacts.length > 0 ? (
            <select
              id="contact-select"
              value={selectedContactId}
              onChange={(e) => {
                setSelectedContactId(e.target.value);
                setCustomTo("");
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">
                {primaryContact
                  ? `Primary: ${primaryContact.name} (${primaryContact.email})`
                  : "Select a contact..."}
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email}){c.isPrimary ? " - Primary" : ""}
                </option>
              ))}
              <option value="__custom">Custom email...</option>
            </select>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              No contacts found. Add contacts first, or enter an email below.
            </p>
          )}

          {selectedContactId === "__custom" && (
            <input
              type="email"
              placeholder="recipient@example.com"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}
        </div>

        {selectedTemplateId && (
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={loadPreview}
              disabled={loadingPreview}
            >
              {loadingPreview ? "Loading..." : "Preview Email"}
            </Button>
          </div>
        )}

        {preview && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Preview: {preview.subject}
            </h3>
            <div
              className="prose prose-sm max-w-none text-xs"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSend} disabled={sending || !selectedTemplateId}>
            {sending ? "Sending..." : "Send Message"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
