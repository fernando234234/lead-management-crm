"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip } from "./Tooltip";

interface HelpIconProps {
  text: string;
  size?: "sm" | "md";
  position?: "top" | "bottom" | "left" | "right";
}

export function HelpIcon({
  text,
  size = "sm",
  position = "top",
}: HelpIconProps) {
  const sizeClasses = {
    sm: 14,
    md: 18,
  };

  return (
    <Tooltip content={text} position={position}>
      <button
        type="button"
        className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 rounded-full"
        aria-label="Mostra informazioni"
      >
        <HelpCircle size={sizeClasses[size]} />
      </button>
    </Tooltip>
  );
}
