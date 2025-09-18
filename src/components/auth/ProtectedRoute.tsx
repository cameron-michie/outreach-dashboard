"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'admin' | 'user';
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (requireRole && session.user.role !== requireRole) {
      router.push("/dashboard"); // Redirect to dashboard if role requirement not met
      return;
    }

    if (!session.user.isActive) {
      router.push("/auth/error?error=AccessDenied");
      return;
    }
  }, [session, status, router, requireRole]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || (requireRole && session.user.role !== requireRole) || !session.user.isActive) {
    return null; // Will redirect
  }

  return <>{children}</>;
}