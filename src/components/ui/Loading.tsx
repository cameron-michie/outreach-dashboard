import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  variant?: "spinner" | "dots" | "pulse";
}

const Loading: React.FC<LoadingProps> = ({
  size = "md",
  text,
  className,
  variant = "spinner"
}) => {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  if (variant === "spinner") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <svg
          className={cn("animate-spin", sizes[size])}
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {text && <span className={textSizes[size]}>{text}</span>}
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className="flex space-x-1">
          <div className={cn("animate-bounce rounded-full bg-current", sizes[size])} style={{ animationDelay: "0ms" }} />
          <div className={cn("animate-bounce rounded-full bg-current", sizes[size])} style={{ animationDelay: "150ms" }} />
          <div className={cn("animate-bounce rounded-full bg-current", sizes[size])} style={{ animationDelay: "300ms" }} />
        </div>
        {text && <span className={textSizes[size]}>{text}</span>}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        <div className={cn("animate-pulse rounded-full bg-current", sizes[size])} />
        {text && <span className={textSizes[size]}>{text}</span>}
      </div>
    );
  }

  return null;
};

// Page-level loading component
export interface PageLoadingProps {
  text?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  text = "Loading...",
  className
}) => (
  <div className={cn("flex items-center justify-center min-h-[200px] w-full", className)}>
    <Loading size="lg" text={text} />
  </div>
);

// Skeleton loading components
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height
}) => (
  <div
    className={cn("animate-pulse rounded-md bg-gray-200", className)}
    style={{ width, height }}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="1rem"
        width={i === lines - 1 ? "75%" : "100%"}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-3 p-4 border rounded-lg", className)}>
    <Skeleton height="1.25rem" width="60%" />
    <SkeletonText lines={2} />
    <div className="flex space-x-2">
      <Skeleton height="2rem" width="5rem" />
      <Skeleton height="2rem" width="5rem" />
    </div>
  </div>
);

Loading.displayName = "Loading";
PageLoading.displayName = "PageLoading";
Skeleton.displayName = "Skeleton";
SkeletonText.displayName = "SkeletonText";
SkeletonCard.displayName = "SkeletonCard";

export { Loading };