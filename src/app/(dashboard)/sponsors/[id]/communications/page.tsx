"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ContactList, type ContactListItem } from "@/components/contacts/ContactList";
import { ContactForm, type ContactFormData } from "@/components/contacts/ContactForm";
import { CommunicationList, type CommunicationListItem } from "@/components/communications/CommunicationList";
import { ComposeMessage } from "@/components/communications/ComposeMessage";

type Tab = "contacts" | "history" | "compose";

interface Contact extends ContactListItem {}
interface Communication extends CommunicationListItem {}

export default function SponsorCommunicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [sponsorId, setSponsorId] = useState<string | null>(null);
  const [sponsorName, setSponsorName] = useState("");
  const [tab, setTab] = useState<Tab>("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    params.then((p) => setSponsorId(p.id));
  }, [params]);

  const fetchContacts = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const data = await apiFetch<{ contacts: Contact[] }>(
        `/api/sponsors/${id}/contacts`,
        { signal }
      );
      setContacts(data.contacts ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    }
  }, []);

  const fetchCommunications = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const data = await apiFetch<{ communications: Communication[] }>(
        `/api/sponsors/${id}/communications`,
        { signal }
      );
      setCommunications(data.communications ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load communications");
    }
  }, []);

  const fetchSponsor = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const data = await apiFetch<{ sponsor: { name: string } }>(
        `/api/sponsors/${id}`,
        { signal }
      );
      setSponsorName(data.sponsor?.name ?? "");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (sessionStatus !== "authenticated" || !sponsorId) return;

    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetchSponsor(sponsorId, controller.signal),
      fetchContacts(sponsorId, controller.signal),
      fetchCommunications(sponsorId, controller.signal),
    ]).finally(() => setLoading(false));

    return () => controller.abort();
  }, [sessionStatus, router, sponsorId, fetchSponsor, fetchContacts, fetchCommunications]);

  async function handleCreateContact(data: ContactFormData) {
    if (!sponsorId) return;
    try {
      await apiFetch(`/api/sponsors/${sponsorId}/contacts`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      setShowContactForm(false);
      await fetchContacts(sponsorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  }

  async function handleUpdateContact(data: ContactFormData) {
    if (!sponsorId || !editingContact) return;
    try {
      await apiFetch(`/api/sponsors/${sponsorId}/contacts/${editingContact.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setEditingContact(null);
      await fetchContacts(sponsorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contact");
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!sponsorId) return;
    try {
      await apiFetch(`/api/sponsors/${sponsorId}/contacts/${contactId}`, {
        method: "DELETE",
      });
      await fetchContacts(sponsorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  function handleMessageSent() {
    if (!sponsorId) return;
    setTab("history");
    fetchCommunications(sponsorId);
  }

  if (sessionStatus !== "authenticated" || !sponsorId) {
    return null;
  }

  if (loading) {
    return (
      <div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "contacts", label: "Contacts" },
    { key: "history", label: "History" },
    { key: "compose", label: "Compose" },
  ];

  return (
    <div>
      <a
        href={`/dashboard/sponsors/${sponsorId}`}
        className="text-sm text-blue-600 hover:text-blue-800"
      >
        &larr; Back to {sponsorName || "Sponsor"}
      </a>

      <PageHeader
        title={`${sponsorName || "Sponsor"} — Communications`}
        description="Manage contacts and send messages to this sponsor."
      />

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs text-red-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6">
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "contacts" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Contacts ({contacts.length})
                </h3>
                {!showContactForm && !editingContact && (
                  <button
                    onClick={() => setShowContactForm(true)}
                    className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    Add Contact
                  </button>
                )}
              </div>

              {showContactForm && (
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                  <ContactForm
                    onSubmit={handleCreateContact}
                    onCancel={() => setShowContactForm(false)}
                  />
                </div>
              )}

              {editingContact && (
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
                  <ContactForm
                    initial={{
                      name: editingContact.name,
                      email: editingContact.email,
                      role: editingContact.role ?? "",
                      phone: editingContact.phone ?? "",
                      isPrimary: editingContact.isPrimary,
                    }}
                    onSubmit={handleUpdateContact}
                    onCancel={() => setEditingContact(null)}
                  />
                </div>
              )}

              <ContactList
                contacts={contacts}
                onEdit={setEditingContact}
                onDelete={handleDeleteContact}
              />
            </div>
          )}

          {tab === "history" && (
            <CommunicationList communications={communications} />
          )}

          {tab === "compose" && (
            <ComposeMessage
              sponsorId={sponsorId}
              contacts={contacts.map((c) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                isPrimary: c.isPrimary,
              }))}
              onSent={handleMessageSent}
              onCancel={() => setTab("history")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
