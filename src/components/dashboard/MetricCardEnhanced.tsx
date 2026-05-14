import { formatCurrency } from "@/lib/format";

interface MetricCardEnhancedProps {
  label: string;
  value: string | number;
  change?: number;
  accentColor: string;
  subtitle?: string;
}

export function MetricCardEnhanced({
  label,
  value,
  change,
  accentColor,
  subtitle,
}: MetricCardEnhancedProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <div className={`h-1 ${accentColor}`} />
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {(change !== undefined || subtitle) && (
          <div className="mt-1 flex items-center gap-2">
            {change !== undefined && (
              <span
                className={`text-xs font-medium ${
                  change >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
