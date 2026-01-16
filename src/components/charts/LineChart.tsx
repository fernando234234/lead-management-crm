"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface LineConfig {
  dataKey: string;
  color: string;
  name?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey?: string;
  color?: string;
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  formatValue?: (value: number) => string;
  lines?: LineConfig[];
}

export function LineChart({
  data,
  xKey,
  yKey,
  color = "#6366f1",
  title,
  height = 300,
  showGrid = true,
  showLegend = false,
  formatValue,
  lines,
}: LineChartProps) {
  const formatTooltipValue = (value: number) => {
    if (formatValue) return formatValue(value);
    return value.toLocaleString("it-IT");
  };

  // Support both single line (yKey) and multiple lines
  const lineConfigs: LineConfig[] = lines || (yKey ? [{ dataKey: yKey, color, name: yKey }] : []);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
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
            formatter={(value, name) => [
              formatTooltipValue(typeof value === 'number' ? value : 0),
              name ?? '',
            ]}
            labelStyle={{ color: "#374151", fontWeight: 500 }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              iconType="circle"
            />
          )}
          {lineConfigs.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
