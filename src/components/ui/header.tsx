"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "./button";
import Link from "next/link";

export function Header() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Outreach Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Outreach Dashboard
            </Link>
            {session && (
              <nav className="ml-10 flex space-x-8">
                <Link
                  href="/dashboard"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/campaigns"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  Campaigns
                </Link>
                <Link
                  href="/icp-accounts"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  ICP Accounts
                </Link>
                <Link
                  href="/templates"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  Templates
                </Link>
                <Link
                  href="/calendar"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  Calendar
                </Link>
                {session.user.role === 'admin' && (
                  <Link
                    href="/admin/users"
                    className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                  >
                    Users
                  </Link>
                )}
                <Link
                  href="/settings"
                  className="text-gray-900 hover:text-gray-600 px-3 py-2 text-sm font-medium"
                >
                  Settings
                </Link>
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <div className="flex items-center space-x-3">
                  {session.user.image && (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || ""}
                    />
                  )}
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">{session.user.name}</p>
                    <p className="text-gray-500 text-xs">{session.user.role}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}