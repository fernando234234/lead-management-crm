"use client";

import type React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface DateInputFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  accent?: "admin" | "commercial" | "marketing" | "blue" | "orange";
  containerClassName?: string;
  inputClassName?: string;
  labelIcon?: React.ReactNode;
}

const accentClasses = {
  admin: "focus:ring-admin focus:border-admin",
  commercial: "focus:ring-commercial focus:border-commercial",
  marketing: "focus:ring-marketing focus:border-marketing",
  blue: "focus:ring-blue-500 focus:border-blue-500",
  orange: "focus:ring-orange-500 focus:border-orange-500",
};

export function DateInputField({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  min,
  max,
  accent = "admin",
  containerClassName,
  inputClassName,
  labelIcon,
}: DateInputFieldProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <div className={containerClassName}>
      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={inputId}>
        {labelIcon}
        {label}
      </label>
      <input
        id={inputId}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={cn(
          "w-full px-3 py-2 border rounded-lg focus:ring-2 disabled:bg-gray-100",
          accentClasses[accent],
          inputClassName
        )}
      />
    </div>
  );
}
