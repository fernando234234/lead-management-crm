"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  badge?: string | number;
  headerClassName?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
  className,
  badge,
  headerClassName,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-admin/50",
          headerClassName
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 text-left">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 text-left">{subtitle}</p>}
          </div>
          {badge !== undefined && (
            <span className="px-2 py-0.5 bg-admin/10 text-admin text-xs font-medium rounded-full">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {isOpen ? "Nascondi" : "Mostra"}
          </span>
          {isOpen ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>
      
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

// A simpler show more/less toggle for inline content
interface ShowMoreProps {
  children: ReactNode;
  previewLines?: number;
  showMoreText?: string;
  showLessText?: string;
}

export function ShowMore({
  children,
  previewLines = 3,
  showMoreText = "Mostra di piu",
  showLessText = "Mostra meno",
}: ShowMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          !isExpanded && `line-clamp-${previewLines}`
        )}
        style={!isExpanded ? { maxHeight: `${previewLines * 1.5}em` } : undefined}
      >
        {children}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-sm text-admin hover:text-admin/80 font-medium focus:outline-none"
      >
        {isExpanded ? showLessText : showMoreText}
      </button>
    </div>
  );
}
