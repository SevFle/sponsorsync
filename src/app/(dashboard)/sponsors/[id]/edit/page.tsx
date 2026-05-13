"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

interface SponsorData {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export default function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  const fetchSponsor = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const data = await apiFetch<{ sponsor: SponsorData }>(`/api/sponsors/${id}`);
      setName(data.sponsor.name ?? "");
      setCompany(data.sponsor.company ?? "");
      setEmail(data.sponsor.email ?? "");
      setPhone(data.sponsor.phone ?? "");
      setNotes(data.sponsor.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sponsor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (sessionStatus !== "authenticated" || !resolvedId) return;
    fetchSponsor(resolvedId);
  }, [fetchSponsor, sessionStatus, router, resolvedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedId) return;

    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await apiFetch(`/api/sponsors/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || undefined,
          company: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      router.push(`/dashboard/sponsors/${resolvedId}`);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
        try {
          const res = await fetch(`/api/sponsors/${resolvedId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim() || undefined,
              company: company.trim() || undefined,
              email: email.trim() || undefined,
              phone: phone.trim() || undefined,
              notes: notes.trim() || undefined,
            }),
          });
          const body = await res.json();
          if (body.details) {
            setFieldErrors(body.details);
          }
        } catch {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to update sponsor");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus !== "authenticated" || !resolvedId) return null;

  if (loading) {
    return (
      <div>
        <a href="/dashboard/sponsors" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Sponsors
        </a>
        <h1 className="mt-4 text-2xl font-bold">Edit Sponsor</h1>
        <div className="mt-6 max-w-lg space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-9 w-full animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <a href={`/dashboard/sponsors/${resolvedId}`} className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Back to Sponsor
        </a>
      </div>
      <h1 className="mt-4 text-2xl font-bold">Edit Sponsor</h1>
      <p className="mt-2 text-gray-500">Update sponsor information.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={255}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Sponsor name"
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
            Company
          </label>
          <input
            type="text"
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Company name"
          />
          {fieldErrors.company && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.company.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="sponsor@company.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="+1 (555) 000-0000"
          />
          {fieldErrors.phone && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.phone.join(", ")}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Any notes about this sponsor..."
          />
          {fieldErrors.notes && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.notes.join(", ")}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <a
            href={`/dashboard/sponsors/${resolvedId}`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
