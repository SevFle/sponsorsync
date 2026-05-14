"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export interface ContactListItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactListProps {
  contacts: ContactListItem[];
  onEdit: (contact: ContactListItem) => void;
  onDelete: (id: string) => void;
  onSelect?: (contact: ContactListItem) => void;
  selectedId?: string;
}

export function ContactList({
  contacts,
  onEdit,
  onDelete,
  onSelect,
  selectedId,
}: ContactListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (contacts.length === 0) {
    return (
      <EmptyState
        message="No contacts yet"
        description="Add a contact person for this sponsor."
      />
    );
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div
          key={contact.id}
          onClick={() => onSelect?.(contact)}
          className={cn(
            "rounded-lg border p-4 transition-colors",
            selectedId === contact.id
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:bg-gray-50",
            onSelect && "cursor-pointer"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                {contact.isPrimary && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Primary
                  </span>
                )}
                {contact.role && (
                  <span className="text-xs text-gray-500">{contact.role}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{contact.email}</p>
              {contact.phone && (
                <p className="mt-0.5 text-xs text-gray-400">{contact.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="text-xs px-2 py-1"
                disabled={deletingId === contact.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(contact.id);
                  onDelete(contact.id);
                }}
              >
                {deletingId === contact.id ? "..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
