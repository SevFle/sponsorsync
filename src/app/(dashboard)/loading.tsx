import { PageHeader } from "@/components/ui/page-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your sponsorship activity." />
      <div className="mt-6">
        <DashboardSkeleton />
      </div>
    </div>
  );
}
