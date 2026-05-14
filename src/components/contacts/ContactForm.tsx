"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface ContactFormData {
  name: string;
  email: string;
  role: string;
  phone: string;
  isPrimary: boolean;
}

interface ContactFormProps {
  initial?: ContactFormData;
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const emptyForm: ContactFormData = {
  name: "",
  email: "",
  role: "",
  phone: "",
  isPrimary: false,
};

export function ContactForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: ContactFormProps) {
  const [form, setForm] = useState<ContactFormData>(initial ?? emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700">
          Name *
        </label>
        <input
          id="contact-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
          Email *
        </label>
        <input
          id="contact-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="contact-role" className="block text-sm font-medium text-gray-700">
          Role
        </label>
        <input
          id="contact-role"
          type="text"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          placeholder="e.g. Marketing Director"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="contact-primary"
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="contact-primary" className="text-sm text-gray-700">
          Primary contact
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initial ? "Update Contact" : "Add Contact"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
