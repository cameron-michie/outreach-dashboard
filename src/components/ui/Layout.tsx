'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { Sidebar, SidebarItem } from "./Sidebar";
import { MobileNavigation, NavigationItem } from "./Navigation";

export interface LayoutProps {
  children: React.ReactNode;
  sidebarItems?: SidebarItem[];
  className?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: (collapsed: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  sidebarItems = [],
  className,
  showSidebar = true,
  showHeader = true,
  sidebarCollapsed = false,
  onSidebarToggle,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(sidebarCollapsed);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSidebarToggle = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    onSidebarToggle?.(newCollapsed);
  };

  // Convert sidebar items to navigation items for mobile
  const mobileNavItems: NavigationItem[] = React.useMemo(() => {
    const flattenItems = (items: SidebarItem[]): NavigationItem[] => {
      return items.reduce<NavigationItem[]>((acc, item) => {
        acc.push({
          id: item.id,
          label: item.label,
          href: item.href,
          icon: item.icon,
          badge: item.badge,
        });
        if (item.children) {
          acc.push(...flattenItems(item.children));
        }
        return acc;
      }, []);
    };
    return flattenItems(sidebarItems);
  }, [sidebarItems]);

  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {/* Header */}
      {showHeader && <Header />}

      <div className="flex">
        {/* Desktop Sidebar */}
        {showSidebar && sidebarItems.length > 0 && (
          <div className="hidden lg:block">
            <Sidebar
              items={sidebarItems}
              isCollapsed={isSidebarCollapsed}
              onToggle={handleSidebarToggle}
            />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {/* Mobile Header with Menu Button */}
          {showSidebar && sidebarItems.length > 0 && (
            <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Open navigation menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="h-full overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      {showSidebar && (
        <MobileNavigation
          items={mobileNavItems}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          title="Menu"
        />
      )}
    </div>
  );
};

// Page layout wrapper with consistent padding and max width
export interface PageProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Page: React.FC<PageProps> = ({
  children,
  title,
  description,
  className,
  maxWidth = "xl",
  padding = "md",
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-7xl",
    "2xl": "max-w-2xl",
    full: "max-w-none",
  };

  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={cn("mx-auto", maxWidthClasses[maxWidth], paddingClasses[padding], className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          )}
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

// Section component for organizing content within pages
export interface SectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "card" | "bordered";
}

export const Section: React.FC<SectionProps> = ({
  children,
  title,
  description,
  className,
  variant = "default",
}) => {
  const variantClasses = {
    default: "",
    card: "bg-white rounded-lg shadow-sm border p-6",
    bordered: "border border-gray-200 rounded-lg p-6",
  };

  return (
    <section className={cn(variantClasses[variant], className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

Layout.displayName = "Layout";
Page.displayName = "Page";
Section.displayName = "Section";

export { Layout };