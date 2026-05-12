import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface SponsorCardSponsor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  activeDealCount: number;
  totalDealCount: number;
  createdAt: Date | string;
}

interface SponsorCardProps {
  sponsor: SponsorCardSponsor;
}

export function SponsorCard({ sponsor }: SponsorCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">
            {sponsor.name}
          </h3>
          {sponsor.company && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {sponsor.company}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              sponsor.activeDealCount > 0
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            )}
          >
            {sponsor.activeDealCount} active
          </span>
          {sponsor.totalDealCount > 0 && (
            <span className="text-xs text-gray-400">
              {sponsor.totalDealCount} total
            </span>
          )}
        </div>
      </div>

      {(sponsor.email || sponsor.phone) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {sponsor.email && (
            <span className="flex items-center gap-1 truncate">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              {sponsor.email}
            </span>
          )}
          {sponsor.phone && (
            <span className="flex items-center gap-1 truncate">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
              {sponsor.phone}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
