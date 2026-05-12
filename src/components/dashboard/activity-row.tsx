export function ActivityRow({
  type,
  title,
  subtitle,
  timeAgo,
}: {
  type: string;
  title: string;
  subtitle: string;
  timeAgo: string;
}) {
  return (
    <div className="rounded border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="truncate text-xs text-gray-500">{subtitle}</p>
        </div>
        <span className="shrink-0 text-xs text-gray-400">{timeAgo}</span>
      </div>
    </div>
  );
}
