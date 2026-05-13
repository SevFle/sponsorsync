"use client";

import { PageHeader } from "@/components/ui/page-header";
import { ErrorBanner } from "@/components/dashboard/error-banner";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your sponsorship activity." />
      <div className="mt-6">
        <ErrorBanner message={error.message || "Something went wrong"} onRetry={reset} />
      </div>
    </div>
  );
}
