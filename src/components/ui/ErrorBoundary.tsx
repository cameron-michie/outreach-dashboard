'use client';

import * as React from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error?: Error;
    errorInfo?: React.ErrorInfo;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
}) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-red-600">Something went wrong</CardTitle>
        <CardDescription>
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-sm bg-gray-50 p-3 rounded-md">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-600">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
              {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
            </pre>
          </details>
        )}
        <div className="flex space-x-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="flex-1"
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Simple error display component
export interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "Error",
  message,
  onRetry,
  className,
}) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="text-red-600">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </CardContent>
  </Card>
);

// Hook for error boundaries in functional components
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    // This would typically send to an error reporting service
    console.error('Caught error:', error, errorInfo);

    // In a real app, you might want to:
    // - Send to Sentry, LogRocket, etc.
    // - Show a toast notification
    // - Navigate to an error page
  }, []);
};

// Async error boundary for handling promise rejections
export const AsyncErrorBoundary: React.FC<{
  children: React.ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => {
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      onError?.(new Error(event.reason));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  return <>{children}</>;
};

ErrorBoundary.displayName = "ErrorBoundary";
ErrorDisplay.displayName = "ErrorDisplay";
AsyncErrorBoundary.displayName = "AsyncErrorBoundary";

export { DefaultErrorFallback };