"use client";

import { useState, useEffect } from "react";
import { Button, Input, Loading, DataTable } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Template {
  _id: string;
  name: string;
  description: string;
  promptTemplate: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/templates');
      const data = await response.json();

      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleTemplateAction = async (templateId: string, action: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchTemplates();
      } else {
        console.error(`Failed to ${action} template`);
      }
    } catch (error) {
      console.error(`Failed to ${action} template:`, error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'Template',
      render: (value: string, row: Template) => (
        <div>
          <div className="font-medium text-gray-900 flex items-center">
            {value}
            {row.isDefault && (
              <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                Default
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      ),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (value: string) => (
        <span className="text-sm text-gray-900">{value}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Last Updated',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Template) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            View
          </Button>
          <Button size="sm" variant="outline">
            Edit
          </Button>
          <Link href={`/campaigns/new?template=${row._id}`}>
            <Button size="sm">
              Use Template
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
                <p className="text-gray-600">Manage and create email campaign templates</p>
              </div>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Template
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Templates
                </label>
                <Input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={fetchTemplates}>
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Templates Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Templates ({filteredTemplates.length})
                </h2>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : filteredTemplates.length > 0 ? (
              <DataTable
                data={filteredTemplates}
                columns={columns}
                loading={loading}
              />
            ) : (
              <div className="p-6 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">No templates found</p>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'No templates match your search.' : 'Get started by creating your first email template.'}
                </p>
                <Button>Create Your First Template</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}