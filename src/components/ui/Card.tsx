"use client";

import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "outlined" | "elevated" | "gradient";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  accent?: boolean;
  accentColor?: string;
}

const variantStyles = {
  default: "bg-white border border-gray-100 shadow-sm",
  outlined: "bg-white border-2 border-gray-200",
  elevated: "bg-white shadow-lg",
  gradient: "bg-gradient-to-br from-white to-gray-50/50 border border-gray-100 shadow-sm",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = "default",
      padding = "md",
      hover = false,
      accent = false,
      accentColor = "border-l-admin",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "rounded-xl",
          "transition-all duration-300 ease-out",
          // Variant styles
          variantStyles[variant],
          // Padding styles
          paddingStyles[padding],
          // Hover effect
          hover && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
          // Accent border
          accent && cn("border-l-4", accentColor),
          // Custom className
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Card Header component
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, icon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between gap-4 mb-4",
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 bg-admin/10 rounded-lg flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Card Body component
interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(className)} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = "CardBody";

// Card Footer component
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  border?: boolean;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, border = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "mt-4 pt-4",
          border && "border-t border-gray-100",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

// Section Card with title accent
interface SectionCardProps extends CardProps {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
}

export const SectionCard = forwardRef<HTMLDivElement, SectionCardProps>(
  ({ title, subtitle, headerAction, children, className, ...props }, ref) => {
    return (
      <Card ref={ref} className={className} {...props}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
              <span className="w-1 h-6 bg-admin rounded-full" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1 ml-4">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
        {children}
      </Card>
    );
  }
);

SectionCard.displayName = "SectionCard";
