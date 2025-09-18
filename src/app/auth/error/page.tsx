"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "Access is restricted to @ably.com email addresses only.",
          description: "Please sign in with your Ably email address to access the outreach dashboard.",
        };
      case "Configuration":
        return {
          title: "Configuration Error",
          message: "There was a problem with the authentication configuration.",
          description: "Please contact the administrator if this error persists.",
        };
      case "Verification":
        return {
          title: "Verification Error",
          message: "The verification token is invalid or has expired.",
          description: "Please try signing in again.",
        };
      default:
        return {
          title: "Authentication Error",
          message: "An unexpected error occurred during authentication.",
          description: "Please try signing in again. If the problem persists, contact support.",
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-center text-lg text-red-600">
            {errorInfo.message}
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorInfo.description}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button asChild className="w-full">
            <Link href="/auth/signin">
              Try Again
            </Link>
          </Button>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-500">
              Error code: {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}