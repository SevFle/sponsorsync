"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getStatusColor, type DeliverableStatusCounts } from "@/lib/analytics";

interface DeliverableStatusGridProps {
  statusCounts: DeliverableStatusCounts;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  submitted: "Submitted",
  verified: "Verified",
  missed: "Missed",
};

export function DeliverableStatusGrid({ statusCounts, total }: DeliverableStatusGridProps) {
  const data = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      status,
    }));

  return (
    <div className="flex items-center gap-6">
      {data.length === 0 ? (
        <div className="flex h-48 w-full items-center justify-center">
          <p className="text-sm text-gray-500">No deliverable data</p>
        </div>
      ) : (
        <>
          <div className="h-48 w-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, "Count"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((entry) => (
              <div key={entry.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: getStatusColor(entry.status) }}
                  />
                  <span className="text-gray-600">{entry.name}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {entry.value}
                  <span className="ml-1 text-gray-400">
                    ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
