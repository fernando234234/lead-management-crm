"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon, Info, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  gradient?: boolean;
  animate?: boolean;
  tooltip?: string;
  accentBorder?: boolean;
  accentColor?: string;
}

// Animated counter hook
function useAnimatedNumber(
  value: number,
  duration: number = 1000,
  enabled: boolean = true
): number {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(value);
      return;
    }

    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue.current + (value - startValue.current) * easeOutQuart;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, enabled]);

  return displayValue;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-admin",
  trend,
  className,
  gradient = false,
  animate = false,
  tooltip,
  accentBorder = false,
  accentColor = "border-admin",
}: StatCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Parse numeric value for animation
  const numericValue = typeof value === "number" 
    ? value 
    : parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;
  
  const isNumeric = typeof value === "number" || /^[\d,.]+$/.test(String(value).replace(/[€$%]/g, ""));
  const prefix = typeof value === "string" ? value.match(/^[€$]/)?.[0] || "" : "";
  const suffix = typeof value === "string" ? value.match(/[%]$/)?.[0] || "" : "";
  
  const animatedValue = useAnimatedNumber(numericValue, 1200, animate && isNumeric);
  
  const displayValue = animate && isNumeric
    ? `${prefix}${Math.round(animatedValue).toLocaleString("it-IT")}${suffix}`
    : value;

  return (
    <article
      className={cn(
        "relative bg-white rounded-xl border border-gray-100 p-6",
        "shadow-sm hover:shadow-md transition-all duration-300 ease-out",
        "hover:-translate-y-0.5",
        gradient && "bg-gradient-to-br from-white to-gray-50/50",
        accentBorder && `border-l-4 ${accentColor}`,
        className
      )}
      aria-label={`${title}: ${value}${trend ? `, ${trend.isPositive ? "aumento" : "diminuzione"} del ${Math.abs(trend.value)}%` : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
            {tooltip && (
              <div className="relative">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-admin/50 rounded"
                  aria-label="Mostra informazioni"
                >
                  <Info size={14} />
                </button>
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold mt-1.5 text-gray-900 tracking-tight">
            {displayValue}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1 truncate">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 mt-2.5 text-sm font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
              aria-label={`${trend.isPositive ? "Aumento" : "Diminuzione"} del ${Math.abs(trend.value)} percento`}
            >
              {trend.isPositive ? (
                <TrendingUp size={16} className="flex-shrink-0" />
              ) : (
                <TrendingDown size={16} className="flex-shrink-0" />
              )}
              <span>
                {trend.isPositive ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-400 font-normal ml-1">vs mese scorso</span>
            </div>
          )}
        </div>
        {Icon && (
          <div 
            className={cn(
              "p-3 rounded-xl transition-transform duration-300",
              "bg-gradient-to-br from-admin/10 to-admin/5",
              "group-hover:scale-105"
            )}
            aria-hidden="true"
          >
            <Icon className={cn(iconColor, "transition-colors")} size={24} />
          </div>
        )}
      </div>
    </article>
  );
}
