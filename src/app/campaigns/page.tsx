"use client";

import { useState, useEffect } from "react";
import { Button, CampaignTable, Loading } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Campaign {
  _id: string;
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  status: string;
  emails: Array<{
    emailNumber: number;
    status: string;
    scheduledDate: string;
  }>;
  created_at: string;
  assignedTo: string;
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchCampaigns = async (page: number = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/campaigns?${params}`);
      const data = await response.json();

      if (data.data) {
        setCampaigns(data.data);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.total_pages || 1);
        setTotalCount(data.pagination?.total_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns(1);
  }, [statusFilter]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleCampaignAction = async (campaignId: string, action: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh campaigns list
        fetchCampaigns(currentPage);
      } else {
        console.error(`Failed to ${action} campaign`);
      }
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Email Campaigns</h1>
                <p className="text-gray-600">Manage your outreach email campaigns</p>
              </div>
              <Link href="/campaigns/new">
                <Button>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={() => fetchCampaigns(currentPage)}>
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Campaigns ({totalCount})
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Last updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : campaigns.length > 0 ? (
              <>
                <CampaignTable
                  campaigns={campaigns}
                  showActions={true}
                  onAction={handleCampaignAction}
                />

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => fetchCampaigns(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => fetchCampaigns(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No campaigns found</p>
                <p className="text-gray-500 mb-4">
                  {statusFilter ? 'No campaigns match your current filter.' : 'Get started by creating your first campaign.'}
                </p>
                <Link href="/campaigns/new">
                  <Button>Create Your First Campaign</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}