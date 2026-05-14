"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatChartCurrency } from "@/utils/chartFormatters";
import { getStageLabel, getStageColor, type PipelineStage } from "@/lib/analytics";

interface PipelineFunnelProps {
  stages: PipelineStage[];
}

export function PipelineFunnel({ stages }: PipelineFunnelProps) {
  const chartData = stages.map((s) => ({
    ...s,
    label: getStageLabel(s.stage),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No pipeline data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 8, left: 80, bottom: 0 }}
        >
          <XAxis
            type="number"
            tickFormatter={formatChartCurrency}
            tick={{ fontSize: 12, fill: "#6b7280" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "#374151" }}
            width={70}
          />
          <Tooltip
            formatter={(value, _name, props) => [
              `${formatChartCurrency(Number(value))} (${(props.payload as PipelineStage).count} deals)`,
              getStageLabel((props.payload as PipelineStage).stage),
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.stage} fill={getStageColor(entry.stage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
