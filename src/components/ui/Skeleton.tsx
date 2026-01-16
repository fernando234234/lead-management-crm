"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 rounded",
        className
      )}
      style={style}
    />
  );
}

// Text skeleton
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 1, className }: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Card skeleton
interface CardSkeletonProps {
  hasHeader?: boolean;
  hasImage?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({
  hasHeader = true,
  hasImage = false,
  lines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-6",
        className
      )}
    >
      {hasImage && <Skeleton className="h-40 w-full mb-4 rounded-lg" />}
      {hasHeader && (
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/3 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      )}
      <TextSkeleton lines={lines} />
    </div>
  );
}

// Stat card skeleton
export function StatCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-6",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="flex gap-4 items-center">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4 flex-1",
                    colIndex === 0 && "max-w-[200px]"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart skeleton
interface ChartSkeletonProps {
  type?: "bar" | "line" | "pie";
  className?: string;
}

export function ChartSkeleton({ type = "bar", className }: ChartSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-6",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-6 w-1 rounded-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      
      {/* Chart area */}
      <div className="h-64 flex items-end gap-2 pt-4">
        {type === "bar" && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </>
        )}
        {type === "line" && (
          <div className="w-full h-full relative">
            <Skeleton className="absolute inset-0 rounded-lg" />
          </div>
        )}
        {type === "pie" && (
          <div className="w-full flex justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

// List skeleton
interface ListSkeletonProps {
  items?: number;
  hasAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({
  items = 5,
  hasAvatar = false,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {hasAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page loading skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Content */}
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
