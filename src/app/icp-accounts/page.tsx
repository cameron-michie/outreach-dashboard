"use client";

import { useState, useEffect } from "react";
import { Button, Input, Loading, DataTable } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ICPAccount {
  ably_account_id: number;
  ably_user_id: number;
  first_name?: string;
  last_name?: string;
  user_email: string;
  company_name: string;
  dt_sign_up: string;
  dt_sdk_connect?: string;
  dt_last_sign_in?: string;
  account_owner: boolean;
  current_package_payment_plan: string;
  icp_validated: boolean;
  icp_validated_date?: string;
  use_case?: string;
  sign_in_count: number;
  num_website_visits?: number;
  messages?: number;
  peak_connections?: number;
  peak_channels?: number;
  brings_you_here?: string;
  whos_developing?: string;
  scale_needs?: string;
}

interface ICPFilters {
  company: string;
  useCase: string;
  hasSDKConnect: boolean;
  minSignInCount: string;
  packagePlan: string;
  accountOwnerOnly: boolean;
}

export default function ICPAccountsPage() {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<ICPAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<ICPFilters>({
    company: '',
    useCase: '',
    hasSDKConnect: false,
    minSignInCount: '',
    packagePlan: '',
    accountOwnerOnly: false,
  });

  const fetchAccounts = async (page: number = 1) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (filters.company) params.append('company', filters.company);
      if (filters.useCase) params.append('use_case', filters.useCase);
      if (filters.hasSDKConnect) params.append('has_sdk_connect', 'true');
      if (filters.minSignInCount) params.append('min_sign_in_count', filters.minSignInCount);
      if (filters.packagePlan) params.append('package_plan', filters.packagePlan);
      if (filters.accountOwnerOnly) params.append('account_owner_only', 'true');

      const response = await fetch(`/api/snowflake/icp-accounts?${params}`);
      const data = await response.json();

      if (data.data) {
        console.log('🔍 Frontend received data:', data);
        console.log('🔍 First account:', data.data[0]);
        setAccounts(data.data);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.total_pages);
        setTotalCount(data.pagination.total_count);
      }
    } catch (error) {
      console.error('Failed to fetch ICP accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(1);
  }, [filters]);

  const handleFilterChange = (key: keyof ICPFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      company: '',
      useCase: '',
      hasSDKConnect: false,
      minSignInCount: '',
      packagePlan: '',
      accountOwnerOnly: false,
    });
  };

  const columns = [
    {
      key: 'COMPANY_NAME',
      label: 'Company',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.USER_EMAIL}</div>
          {(row.FIRST_NAME || row.LAST_NAME) && (
            <div className="text-xs text-gray-400">
              {[row.FIRST_NAME, row.LAST_NAME].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'USE_CASE',
      label: 'Use Case',
      render: (value: string) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-900 truncate" title={value}>
            {value || 'Not specified'}
          </div>
        </div>
      ),
    },
    {
      key: 'SIGN_IN_COUNT',
      label: 'Sign-ins',
      render: (value: number) => (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'DT_SDK_CONNECT',
      label: 'SDK Connected',
      render: (value: string | null) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'CURRENT_PACKAGE_PAYMENT_PLAN',
      label: 'Package Plan',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'free_tier' ? 'bg-gray-100 text-gray-800' :
          value === 'ably_standard' ? 'bg-blue-100 text-blue-800' :
          value === 'ably_pro' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value === 'free_tier' ? 'Free' :
           value === 'ably_standard' ? 'Standard' :
           value === 'ably_pro' ? 'Pro' : value}
        </span>
      ),
    },
    {
      key: 'ACCOUNT_OWNER',
      label: 'Account Owner',
      render: (value: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value && typeof value === 'string' && value.includes('(') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value && typeof value === 'string' && value.includes('(') ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'DT_LAST_SIGN_IN',
      label: 'Last Sign In',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex space-x-2">
          <Link href={`/campaigns/new?company=${encodeURIComponent(row.COMPANY_NAME)}&email=${encodeURIComponent(row.USER_EMAIL)}`}>
            <Button size="sm" variant="outline">
              Create Campaign
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">ICP Accounts</h1>
            <p className="text-gray-600">Browse and filter potential target accounts for outreach campaigns</p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Email
                </label>
                <Input
                  type="text"
                  placeholder="Search companies or emails..."
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Case
                </label>
                <Input
                  type="text"
                  placeholder="Search use cases..."
                  value={filters.useCase}
                  onChange={(e) => handleFilterChange('useCase', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Package Plan
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={filters.packagePlan}
                  onChange={(e) => handleFilterChange('packagePlan', e.target.value)}
                >
                  <option value="">All Plans</option>
                  <option value="free_tier">Free Tier</option>
                  <option value="ably_standard">Standard</option>
                  <option value="ably_pro">Pro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Sign-ins
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minSignInCount}
                  onChange={(e) => handleFilterChange('minSignInCount', e.target.value)}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quick Filters
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={filters.accountOwnerOnly}
                    onChange={(e) => handleFilterChange('accountOwnerOnly', e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-600">Account Owners Only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={filters.hasSDKConnect}
                    onChange={(e) => handleFilterChange('hasSDKConnect', e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-600">SDK Connected</span>
                </label>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Accounts ({totalCount})
                </h2>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => fetchAccounts(currentPage)}>
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : accounts.length > 0 ? (
              <>
                <DataTable
                  data={accounts}
                  columns={columns}
                  loading={loading}
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
                        onClick={() => fetchAccounts(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => fetchAccounts(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No accounts found matching your filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}