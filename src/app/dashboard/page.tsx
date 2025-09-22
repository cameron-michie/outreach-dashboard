"use client";

import { Button, CampaignTable, Loading } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
  activeCampaigns: number;
  pendingApprovals: number;
  emailsSentToday: number;
  icpAccountsCount: number;
}

interface Campaign {
  _id: string;
  name: string;
  status: string;
  email_count: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    pendingApprovals: 0,
    emailsSentToday: 0,
    icpAccountsCount: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch campaigns
        const campaignsResponse = await fetch('/api/campaigns?limit=5');
        const campaignsData = await campaignsResponse.json();

        // Fetch ICP accounts count
        const icpResponse = await fetch('/api/snowflake/icp-accounts?limit=1');
        const icpData = await icpResponse.json();

        if (campaignsData.data) {
          setCampaigns(campaignsData.data);

          // Calculate stats from campaigns
          const activeCampaigns = campaignsData.data.filter((c: Campaign) =>
            c.status === 'active' || c.status === 'running'
          ).length;

          const pendingApprovals = campaignsData.data.filter((c: Campaign) =>
            c.status === 'pending_approval'
          ).length;

          // Calculate emails sent today (simplified - would need more detailed API)
          const today = new Date().toDateString();
          const emailsSentToday = campaignsData.data.reduce((total: number, c: Campaign) => {
            const createdDate = new Date(c.created_at).toDateString();
            return createdDate === today ? total + c.sent_count : total;
          }, 0);

          setStats({
            activeCampaigns,
            pendingApprovals,
            emailsSentToday,
            icpAccountsCount: icpData.pagination?.total_count || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {session?.user.name?.split(' ')[0]}!</h1>
            <p className="text-gray-600">Here's what's happening with your outreach campaigns</p>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
                      <p className="text-3xl font-bold text-blue-600">{stats.activeCampaigns}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">campaigns running</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                      <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">emails awaiting approval</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Emails Sent Today</h2>
                      <p className="text-3xl font-bold text-green-600">{stats.emailsSentToday}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">emails sent successfully</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">ICP Accounts</h2>
                      <p className="text-3xl font-bold text-purple-600">{stats.icpAccountsCount}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">potential targets</p>
                </div>
              </div>
            </>
          )}

          {/* Recent Campaigns Section */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Recent Campaigns</h2>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : campaigns.length > 0 ? (
              <CampaignTable campaigns={campaigns} showActions={false} />
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No campaigns yet. Create your first campaign to get started!</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/campaigns/new">
                <Button className="h-16 flex flex-col items-center justify-center w-full">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Campaign
                </Button>
              </Link>

              <Link href="/icp-accounts">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center w-full">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Browse ICP Accounts
                </Button>
              </Link>

              <Link href="/templates">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center w-full">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  View Templates
                </Button>
              </Link>

              <Link href="/calendar">
                <Button variant="outline" className="h-16 flex flex-col items-center justify-center w-full">
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar View
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}