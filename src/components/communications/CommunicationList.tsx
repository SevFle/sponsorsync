"use client";

import { EmptyState } from "@/components/ui/empty-state";

export interface CommunicationListItem {
  id: string;
  subject: string;
  to: string;
  status: string;
  templateId: string | null;
  sponsorContactId: string | null;
  sentAt: string;
}

interface CommunicationListProps {
  communications: CommunicationListItem[];
  onView?: (id: string) => void;
}

function getStatusStyles(status: string): string {
  switch (status) {
    case "sent":
      return "bg-blue-100 text-blue-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "bounced":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function CommunicationList({
  communications,
  onView,
}: CommunicationListProps) {
  if (communications.length === 0) {
    return (
      <EmptyState
        message="No communications yet"
        description="Send a message to this sponsor to see the history here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {communications.map((comm) => (
        <div
          key={comm.id}
          onClick={() => onView?.(comm.id)}
          className={`rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50 ${
            onView ? "cursor-pointer" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {comm.subject}
              </h3>
              <p className="mt-1 text-xs text-gray-500">To: {comm.to}</p>
            </div>
            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyles(comm.status)}`}
              >
                {comm.status}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(comm.sentAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
