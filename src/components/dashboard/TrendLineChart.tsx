"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatChartCurrency, formatPeriodLabel, CHART_COLORS } from "@/utils/chartFormatters";
import type { TrendPoint } from "@/lib/analytics";

interface TrendLineChartProps {
  revenueTrend: TrendPoint[];
  completionTrend: TrendPoint[];
}

export function TrendLineChart({ revenueTrend, completionTrend }: TrendLineChartProps) {
  const periodSet = new Set([
    ...revenueTrend.map((t) => t.period),
    ...completionTrend.map((t) => t.period),
  ]);

  const revenueMap = new Map(revenueTrend.map((t) => [t.period, t.value]));
  const completionMap = new Map(completionTrend.map((t) => [t.period, t.value]));

  const chartData = Array.from(periodSet)
    .sort()
    .map((period) => ({
      period,
      label: formatPeriodLabel(period),
      revenue: revenueMap.get(period) ?? 0,
      completions: completionMap.get(period) ?? 0,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">No trend data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#d1d5db" }}
          />
          <YAxis
            yAxisId="revenue"
            tickFormatter={formatChartCurrency}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#d1d5db" }}
          />
          <YAxis
            yAxisId="completions"
            orientation="right"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={{ stroke: "#d1d5db" }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
            formatter={(value, name) => {
              if (name === "revenue") return [formatChartCurrency(Number(value)), "Revenue"];
              return [value, "Completions"];
            }}
          />
          <Legend />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.blue}
            strokeWidth={2}
            dot={{ r: 3 }}
            name="revenue"
          />
          <Line
            yAxisId="completions"
            type="monotone"
            dataKey="completions"
            stroke={CHART_COLORS.green}
            strokeWidth={2}
            dot={{ r: 3 }}
            name="completions"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
