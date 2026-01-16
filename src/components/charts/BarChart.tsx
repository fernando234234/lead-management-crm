"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  color?: string;
  title?: string;
  height?: number;
  showGrid?: boolean;
  formatValue?: (value: number) => string;
  colors?: string[];
}

export function BarChart({
  data,
  xKey,
  yKey,
  color = "#6366f1",
  title,
  height = 300,
  showGrid = true,
  formatValue,
  colors,
}: BarChartProps) {
  const formatTooltipValue = (value: number) => {
    if (formatValue) return formatValue(value);
    return value.toLocaleString("it-IT");
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          )}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={(value) => formatTooltipValue(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value) => [formatTooltipValue(value as number), ""]}
            labelStyle={{ color: "#374151", fontWeight: 500 }}
          />
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={50}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors ? colors[index % colors.length] : color}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
