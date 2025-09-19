'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

// Container component for consistent max-width and centering
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "xl", padding = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-screen-sm",
      md: "max-w-screen-md",
      lg: "max-w-screen-lg",
      xl: "max-w-screen-xl",
      "2xl": "max-w-screen-2xl",
      full: "max-w-none",
    };

    const paddingClasses = {
      none: "",
      sm: "px-4",
      md: "px-4 sm:px-6",
      lg: "px-4 sm:px-6 lg:px-8",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full",
          sizeClasses[size],
          paddingClasses[padding],
          className
        )}
        {...props}
      />
    );
  }
);

// Grid component for responsive layouts
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12;
  };
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, gap = "md", responsive, ...props }, ref) => {
    const gapClasses = {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    };

    const colClasses = {
      1: "grid-cols-1",
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
      6: "grid-cols-6",
      8: "grid-cols-8",
      12: "grid-cols-12",
    };

    const responsiveClasses = responsive ? [
      responsive.sm && `sm:grid-cols-${responsive.sm}`,
      responsive.md && `md:grid-cols-${responsive.md}`,
      responsive.lg && `lg:grid-cols-${responsive.lg}`,
      responsive.xl && `xl:grid-cols-${responsive.xl}`,
    ].filter(Boolean) : [];

    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colClasses[cols],
          gapClasses[gap],
          ...responsiveClasses,
          className
        )}
        {...props}
      />
    );
  }
);

// Flex component for flexible layouts
export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col" | "row-reverse" | "col-reverse";
  align?: "start" | "end" | "center" | "baseline" | "stretch";
  justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
  wrap?: "wrap" | "nowrap" | "wrap-reverse";
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({
    className,
    direction = "row",
    align,
    justify,
    wrap = "nowrap",
    gap,
    ...props
  }, ref) => {
    const directionClasses = {
      row: "flex-row",
      col: "flex-col",
      "row-reverse": "flex-row-reverse",
      "col-reverse": "flex-col-reverse",
    };

    const alignClasses = align ? {
      start: "items-start",
      end: "items-end",
      center: "items-center",
      baseline: "items-baseline",
      stretch: "items-stretch",
    }[align] : "";

    const justifyClasses = justify ? {
      start: "justify-start",
      end: "justify-end",
      center: "justify-center",
      between: "justify-between",
      around: "justify-around",
      evenly: "justify-evenly",
    }[justify] : "";

    const wrapClasses = {
      wrap: "flex-wrap",
      nowrap: "flex-nowrap",
      "wrap-reverse": "flex-wrap-reverse",
    };

    const gapClasses = gap ? {
      xs: "gap-2",
      sm: "gap-3",
      md: "gap-4",
      lg: "gap-6",
      xl: "gap-8",
    }[gap] : "";

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          directionClasses[direction],
          alignClasses,
          justifyClasses,
          wrapClasses[wrap],
          gapClasses,
          className
        )}
        {...props}
      />
    );
  }
);

// Stack component for vertical layouts with consistent spacing
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  align?: "start" | "end" | "center" | "stretch";
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing = "md", align, ...props }, ref) => {
    const spacingClasses = {
      xs: "space-y-2",
      sm: "space-y-3",
      md: "space-y-4",
      lg: "space-y-6",
      xl: "space-y-8",
      "2xl": "space-y-12",
    };

    const alignClasses = align ? {
      start: "items-start",
      end: "items-end",
      center: "items-center",
      stretch: "items-stretch",
    }[align] : "";

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col",
          spacingClasses[spacing],
          alignClasses,
          className
        )}
        {...props}
      />
    );
  }
);

// Responsive utility hook
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = React.useState<string>('');

  React.useEffect(() => {
    const getBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) return '2xl';
      if (width >= 1280) return 'xl';
      if (width >= 1024) return 'lg';
      if (width >= 768) return 'md';
      if (width >= 640) return 'sm';
      return 'xs';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isSm: breakpoint === 'sm',
    isMd: breakpoint === 'md',
    isLg: breakpoint === 'lg',
    isXl: breakpoint === 'xl',
    is2xl: breakpoint === '2xl',
    isAboveSm: ['md', 'lg', 'xl', '2xl'].includes(breakpoint),
    isAboveMd: ['lg', 'xl', '2xl'].includes(breakpoint),
    isAboveLg: ['xl', '2xl'].includes(breakpoint),
  };
};

// Show/Hide components based on breakpoints
export interface ShowProps {
  children: React.ReactNode;
  above?: "sm" | "md" | "lg" | "xl";
  below?: "sm" | "md" | "lg" | "xl";
  only?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Show: React.FC<ShowProps> = ({ children, above, below, only }) => {
  let className = "";

  if (above) {
    const classes = {
      sm: "hidden sm:block",
      md: "hidden md:block",
      lg: "hidden lg:block",
      xl: "hidden xl:block",
    };
    className = classes[above];
  }

  if (below) {
    const classes = {
      sm: "block sm:hidden",
      md: "block md:hidden",
      lg: "block lg:hidden",
      xl: "block xl:hidden",
    };
    className = classes[below];
  }

  if (only) {
    const classes = {
      sm: "hidden sm:block md:hidden",
      md: "hidden md:block lg:hidden",
      lg: "hidden lg:block xl:hidden",
      xl: "hidden xl:block 2xl:hidden",
      "2xl": "hidden 2xl:block",
    };
    className = classes[only];
  }

  return <div className={className}>{children}</div>;
};

Container.displayName = "Container";
Grid.displayName = "Grid";
Flex.displayName = "Flex";
Stack.displayName = "Stack";
Show.displayName = "Show";

export { Container, Grid, Flex, Stack };