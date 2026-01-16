"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  accentColor?: "admin" | "commercial" | "marketing";
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  accentColor = "admin",
}: EmptyStateProps) {
  const colorClasses = {
    admin: "bg-admin hover:bg-admin/90",
    commercial: "bg-commercial hover:bg-commercial/90",
    marketing: "bg-marketing hover:bg-marketing/90",
  };

  const iconBgClasses = {
    admin: "bg-red-50",
    commercial: "bg-blue-50",
    marketing: "bg-purple-50",
  };

  const iconColorClasses = {
    admin: "text-admin",
    commercial: "text-commercial",
    marketing: "text-marketing",
  };

  const ActionButton = () => {
    const buttonClasses = `
      inline-flex items-center gap-2 px-4 py-2 
      ${colorClasses[accentColor]} 
      text-white rounded-lg transition font-medium
    `;

    if (actionHref) {
      return (
        <Link href={actionHref} className={buttonClasses}>
          {actionLabel}
        </Link>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClasses}>
          {actionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className={`
          w-16 h-16 rounded-full flex items-center justify-center mb-4
          ${iconBgClasses[accentColor]}
        `}
      >
        <Icon size={32} className={iconColorClasses[accentColor]} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && <ActionButton />}
    </div>
  );
}
