export function MetricCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string | number;
  accentColor: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className={`h-1 ${accentColor}`} />
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
