import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      aria-hidden="true"
    />
  );
}

export function DeliverableCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-5 w-20" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function DealCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-5 w-20" />
          <Skeleton className="ml-auto h-5 w-14" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-1.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
