"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  variant?: "default" | "accent";
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  variant = "default",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setShouldRender(true);
      // Small delay for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    // Wait for fade out animation
    setTimeout(() => {
      setShouldRender(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent",
  };

  const arrowBorderColors: Record<string, string> = {
    top: variant === "accent" ? "border-t-red-600" : "border-t-white",
    bottom: variant === "accent" ? "border-b-red-600" : "border-b-white",
    left: variant === "accent" ? "border-l-red-600" : "border-l-white",
    right: variant === "accent" ? "border-r-red-600" : "border-r-white",
  };

  const bgColor = variant === "accent" ? "bg-red-600 text-white" : "bg-white text-gray-800";

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {shouldRender && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg
            max-w-xs whitespace-normal
            transition-opacity duration-150 ease-in-out
            ${positionClasses[position]}
            ${bgColor}
            ${variant === "default" ? "border border-gray-200" : ""}
            ${isVisible ? "opacity-100" : "opacity-0"}
          `}
        >
          {content}
          {/* Arrow */}
          <div
            className={`
              absolute w-0 h-0 border-[6px]
              ${arrowClasses[position]}
              ${arrowBorderColors[position]}
            `}
          />
        </div>
      )}
    </div>
  );
}
