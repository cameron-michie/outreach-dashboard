'use client';

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface SidebarProps {
  items: SidebarItem[];
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  showToggle?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  className,
  isCollapsed = false,
  onToggle,
  showToggle = true,
}) => {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Toggle Button */}
      {showToggle && (
        <div className="flex items-center justify-end p-4 border-b border-gray-200">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <SidebarItemComponent
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
            pathname={pathname}
          />
        ))}
      </nav>
    </aside>
  );
};

interface SidebarItemComponentProps {
  item: SidebarItem;
  isCollapsed: boolean;
  pathname: string;
  level?: number;
}

const SidebarItemComponent: React.FC<SidebarItemComponentProps> = ({
  item,
  isCollapsed,
  pathname,
  level = 0,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={handleClick}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
            "hover:bg-gray-100",
            isActive && "bg-blue-50 text-blue-700 border-r-2 border-blue-700",
            level > 0 && "ml-4"
          )}
        >
          <div className="flex items-center space-x-3">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            {!isCollapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>
          {!isCollapsed && hasChildren && (
            <svg
              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          className={cn(
            "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
            "hover:bg-gray-100",
            isActive && "bg-blue-50 text-blue-700 border-r-2 border-blue-700",
            level > 0 && "ml-4"
          )}
        >
          <div className="flex items-center space-x-3">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            {!isCollapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-gray-200 text-gray-800 text-xs px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>
        </Link>
      )}

      {/* Children */}
      {hasChildren && isOpen && !isCollapsed && (
        <div className="mt-1 space-y-1">
          {item.children!.map((child) => (
            <SidebarItemComponent
              key={child.id}
              item={child}
              isCollapsed={isCollapsed}
              pathname={pathname}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

Sidebar.displayName = "Sidebar";

export { Sidebar };