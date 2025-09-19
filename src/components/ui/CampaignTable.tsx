'use client';

import * as React from "react";
import { DataTable, Column } from "./DataTable";
import { Button } from "./button";
import { Card } from "./Card";

// Campaign-specific interfaces
export interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed" | "archived";
  type: "email" | "sms" | "social" | "mixed";
  startDate: string;
  endDate?: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  tags: string[];
  lastModified: string;
  createdBy: string;
}

export interface CampaignTableProps {
  campaigns: Campaign[];
  loading?: boolean;
  error?: string;
  onEdit?: (campaign: Campaign) => void;
  onDuplicate?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
  onStatusChange?: (campaign: Campaign, newStatus: Campaign['status']) => void;
  onRowClick?: (campaign: Campaign) => void;
  selectedCampaigns?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

// Status badge component
const StatusBadge: React.FC<{ status: Campaign['status'] }> = ({ status }) => {
  const statusConfig = {
    draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
    active: { color: "bg-green-100 text-green-800", label: "Active" },
    paused: { color: "bg-yellow-100 text-yellow-800", label: "Paused" },
    completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
    archived: { color: "bg-gray-100 text-gray-600", label: "Archived" },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Type badge component
const TypeBadge: React.FC<{ type: Campaign['type'] }> = ({ type }) => {
  const typeConfig = {
    email: { color: "bg-blue-100 text-blue-800", label: "Email", icon: "📧" },
    sms: { color: "bg-green-100 text-green-800", label: "SMS", icon: "📱" },
    social: { color: "bg-purple-100 text-purple-800", label: "Social", icon: "📱" },
    mixed: { color: "bg-orange-100 text-orange-800", label: "Mixed", icon: "🔄" },
  };

  const config = typeConfig[type];

  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

// Tags component
const TagsList: React.FC<{ tags: string[] }> = ({ tags }) => {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 2).map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
        >
          {tag}
        </span>
      ))}
      {tags.length > 2 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          +{tags.length - 2} more
        </span>
      )}
    </div>
  );
};

// Metrics component
const MetricsDisplay: React.FC<{
  openRate: number;
  clickRate: number;
  replyRate: number;
}> = ({ openRate, clickRate, replyRate }) => {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-gray-500">Open:</span>
        <span className="font-medium">{(openRate * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Click:</span>
        <span className="font-medium">{(clickRate * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Reply:</span>
        <span className="font-medium">{(replyRate * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

// Progress bar component
const ProgressBar: React.FC<{ sent: number; total: number }> = ({ sent, total }) => {
  const percentage = total > 0 ? (sent / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Progress</span>
        <span className="font-medium">{sent.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 text-right">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  loading = false,
  error,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  onRowClick,
  selectedCampaigns = [],
  onSelectionChange,
}) => {
  const columns: Column<Campaign>[] = [
    {
      id: "name",
      header: "Campaign",
      accessor: "name",
      cell: (value, campaign) => (
        <div className="space-y-1">
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">
            Created by {campaign.createdBy}
          </div>
          <TagsList tags={campaign.tags} />
        </div>
      ),
      width: "25%",
    },
    {
      id: "status",
      header: "Status",
      accessor: "status",
      cell: (value) => <StatusBadge status={value} />,
      width: "10%",
      align: "center",
    },
    {
      id: "type",
      header: "Type",
      accessor: "type",
      cell: (value) => <TypeBadge type={value} />,
      width: "10%",
      align: "center",
    },
    {
      id: "progress",
      header: "Progress",
      cell: (_, campaign) => (
        <ProgressBar sent={campaign.sentCount} total={campaign.recipientCount} />
      ),
      width: "15%",
      sortable: false,
    },
    {
      id: "metrics",
      header: "Performance",
      cell: (_, campaign) => (
        <MetricsDisplay
          openRate={campaign.openRate}
          clickRate={campaign.clickRate}
          replyRate={campaign.replyRate}
        />
      ),
      width: "15%",
      sortable: false,
    },
    {
      id: "dates",
      header: "Timeline",
      cell: (_, campaign) => (
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-gray-500">Start:</span>
            <span className="ml-1">{new Date(campaign.startDate).toLocaleDateString()}</span>
          </div>
          {campaign.endDate && (
            <div>
              <span className="text-gray-500">End:</span>
              <span className="ml-1">{new Date(campaign.endDate).toLocaleDateString()}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Modified:</span>
            <span className="ml-1">{new Date(campaign.lastModified).toLocaleDateString()}</span>
          </div>
        </div>
      ),
      width: "15%",
      sortable: false,
    },
  ];

  const actions = [
    ...(onEdit ? [{
      label: "Edit",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: onEdit,
      variant: "outline" as const,
    }] : []),
    ...(onDuplicate ? [{
      label: "Duplicate",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: onDuplicate,
      variant: "outline" as const,
    }] : []),
    ...(onDelete ? [{
      label: "Delete",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      variant: "destructive" as const,
      disabled: (campaign: Campaign) => campaign.status === "active",
    }] : []),
  ];

  const emptyState = (
    <div className="text-center py-12">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4-4-4m0 0L9 7" />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
      <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign.</p>
    </div>
  );

  return (
    <DataTable
      data={campaigns}
      columns={columns}
      loading={loading}
      error={error}
      actions={actions}
      emptyState={emptyState}
      selectable={true}
      selectedRows={selectedCampaigns}
      onSelectionChange={onSelectionChange}
      getRowId={(campaign) => campaign.id}
      onRowClick={onRowClick}
      rowClickable={!!onRowClick}
      getRowClassName={(campaign) => {
        if (campaign.status === "archived") return "opacity-60";
        if (campaign.status === "active") return "border-l-4 border-l-green-500";
        return "";
      }}
      sortable={true}
      filterable={true}
      defaultSort={{ key: "lastModified", direction: "desc" }}
    />
  );
};

// Campaign stats cards
export interface CampaignStatsProps {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  averageReplyRate: number;
}

export const CampaignStats: React.FC<CampaignStatsProps> = ({
  totalCampaigns,
  activeCampaigns,
  totalRecipients,
  averageOpenRate,
  averageClickRate,
  averageReplyRate,
}) => {
  const stats = [
    {
      label: "Total Campaigns",
      value: totalCampaigns.toLocaleString(),
      icon: "📊",
      color: "text-blue-600",
    },
    {
      label: "Active Campaigns",
      value: activeCampaigns.toLocaleString(),
      icon: "🚀",
      color: "text-green-600",
    },
    {
      label: "Total Recipients",
      value: totalRecipients.toLocaleString(),
      icon: "👥",
      color: "text-purple-600",
    },
    {
      label: "Avg. Open Rate",
      value: `${(averageOpenRate * 100).toFixed(1)}%`,
      icon: "👁️",
      color: "text-orange-600",
    },
    {
      label: "Avg. Click Rate",
      value: `${(averageClickRate * 100).toFixed(1)}%`,
      icon: "🔗",
      color: "text-indigo-600",
    },
    {
      label: "Avg. Reply Rate",
      value: `${(averageReplyRate * 100).toFixed(1)}%`,
      icon: "💬",
      color: "text-pink-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            <div className="text-2xl">{stat.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
};

CampaignTable.displayName = "CampaignTable";
CampaignStats.displayName = "CampaignStats";

export { CampaignTable };