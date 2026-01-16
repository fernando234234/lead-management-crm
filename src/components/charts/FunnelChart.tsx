"use client";

interface FunnelStage {
  name: string;
  value: number;
  color: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  height?: number;
  showPercentages?: boolean;
  showDropoff?: boolean;
}

export function FunnelChart({
  stages,
  title,
  height = 300,
  showPercentages = true,
  showDropoff = true,
}: FunnelChartProps) {
  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      )}
      <div
        className="flex flex-col items-center justify-center gap-1"
        style={{ minHeight: height }}
      >
        {stages.map((stage, index) => {
          const widthPercent = (stage.value / maxValue) * 100;
          const prevValue = index > 0 ? stages[index - 1].value : stage.value;
          const dropoff = prevValue > 0 ? ((prevValue - stage.value) / prevValue) * 100 : 0;
          const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;

          return (
            <div key={stage.name} className="w-full flex flex-col items-center">
              {/* Dropoff indicator */}
              {showDropoff && index > 0 && dropoff > 0 && (
                <div className="flex items-center justify-center py-1 text-xs text-red-500 font-medium">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                  -{dropoff.toFixed(1)}%
                </div>
              )}

              {/* Funnel stage */}
              <div
                className="relative flex items-center justify-center transition-all duration-500 rounded-lg"
                style={{
                  width: `${Math.max(widthPercent, 30)}%`,
                  height: `${height / stages.length - 16}px`,
                  backgroundColor: stage.color,
                  minWidth: "120px",
                }}
              >
                <div className="text-white font-medium text-center px-2">
                  <span className="block text-sm">{stage.name}</span>
                  <span className="block text-lg font-bold">
                    {stage.value.toLocaleString("it-IT")}
                  </span>
                  {showPercentages && (
                    <span className="block text-xs opacity-80">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
