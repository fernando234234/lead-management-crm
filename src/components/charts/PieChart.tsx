"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

interface PieChartProps {
  data: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  colors?: string[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  formatValue?: (value: number) => string;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#eab308", // yellow
  "#a855f7", // purple
  "#22c55e", // green
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export function PieChart({
  data,
  nameKey,
  valueKey,
  colors = DEFAULT_COLORS,
  title,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  formatValue,
}: PieChartProps) {
  const formatTooltipValue = (value: number) => {
    if (formatValue) return formatValue(value);
    return value.toLocaleString("it-IT");
  };

  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0);

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    
    if (
      typeof cx !== "number" ||
      typeof cy !== "number" ||
      typeof midAngle !== "number" ||
      typeof innerRadius !== "number" ||
      typeof outerRadius !== "number" ||
      typeof percent !== "number" ||
      percent < 0.05
    ) {
      return null;
    }
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={height / 3}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
            formatter={(value) => {
              const numValue = typeof value === "number" ? value : 0;
              return [
                `${formatTooltipValue(numValue)} (${((numValue / total) * 100).toFixed(1)}%)`,
                "",
              ];
            }}
            labelStyle={{ color: "#374151", fontWeight: 500 }}
          />
          {showLegend && (
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
              iconType="circle"
              iconSize={8}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
