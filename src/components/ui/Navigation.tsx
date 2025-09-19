'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface NavigationProps {
  items: NavigationItem[];
  className?: string;
  variant?: "horizontal" | "vertical" | "tabs" | "pills";
  size?: "sm" | "md" | "lg";
}

const Navigation: React.FC<NavigationProps> = ({
  items,
  className,
  variant = "horizontal",
  size = "md",
}) => {
  const pathname = usePathname();

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  const variantClasses = {
    horizontal: "flex items-center space-x-1",
    vertical: "flex flex-col space-y-1",
    tabs: "flex items-center border-b border-gray-200",
    pills: "flex items-center space-x-2",
  };

  const getItemClasses = (item: NavigationItem, isActive: boolean) => {
    const baseClasses = cn(
      "transition-colors font-medium",
      sizeClasses[size],
      item.disabled && "opacity-50 cursor-not-allowed"
    );

    switch (variant) {
      case "horizontal":
        return cn(
          baseClasses,
          "rounded-md",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          item.disabled && "hover:bg-transparent hover:text-gray-600"
        );

      case "vertical":
        return cn(
          baseClasses,
          "rounded-md w-full text-left",
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          item.disabled && "hover:bg-transparent hover:text-gray-600"
        );

      case "tabs":
        return cn(
          baseClasses,
          "border-b-2 border-transparent",
          isActive
            ? "border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-gray-700 hover:border-gray-300",
          item.disabled && "hover:text-gray-500 hover:border-transparent"
        );

      case "pills":
        return cn(
          baseClasses,
          "rounded-full",
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          item.disabled && "hover:bg-transparent hover:text-gray-600"
        );

      default:
        return baseClasses;
    }
  };

  return (
    <nav className={cn(variantClasses[variant], className)} role="navigation">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const itemClasses = getItemClasses(item, isActive);

        if (item.disabled) {
          return (
            <span
              key={item.id}
              className={itemClasses}
              aria-disabled="true"
            >
              <div className="flex items-center space-x-2">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-gray-200 text-gray-800 text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </span>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            className={itemClasses}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="flex items-center space-x-2">
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  variant === "pills" && isActive
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                )}>
                  {item.badge}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
};

// Breadcrumb navigation component
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className,
  separator = (
    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
}) => (
  <nav className={cn("flex items-center space-x-2 text-sm", className)} aria-label="Breadcrumb">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;

      return (
        <React.Fragment key={index}>
          {item.href && !isLast ? (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(isLast ? "text-gray-900 font-medium" : "text-gray-500")}>
              {item.label}
            </span>
          )}
          {!isLast && <span aria-hidden="true">{separator}</span>}
        </React.Fragment>
      );
    })}
  </nav>
);

// Mobile navigation drawer
export interface MobileNavigationProps {
  items: NavigationItem[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  isOpen,
  onClose,
  title = "Navigation",
}) => {
  const pathname = usePathname();

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Navigation Panel */}
      <div className="absolute top-0 left-0 h-full w-64 bg-white shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100"
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4">
          <Navigation
            items={items}
            variant="vertical"
            className="space-y-2"
          />
        </nav>
      </div>
    </div>
  );
};

Navigation.displayName = "Navigation";
Breadcrumb.displayName = "Breadcrumb";
MobileNavigation.displayName = "MobileNavigation";

export { Navigation };