"use client";

import { useState, useEffect } from "react";
import { Button, Input, Loading, DataTable, Modal } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";

interface User {
  _id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
  const [processingInvite, setProcessingInvite] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh users list
        fetchUsers();
      } else {
        console.error(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.endsWith('@ably.com')) {
      alert('Only @ably.com email addresses are allowed');
      return;
    }

    try {
      setProcessingInvite(true);

      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('user');
        fetchUsers();
        alert('User invited successfully');
      } else {
        const error = await response.json();
        alert(`Failed to invite user: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      alert('Failed to invite user');
    } finally {
      setProcessingInvite(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (value: string, row: User) => (
        <div className="flex items-center">
          {row.picture && (
            <img
              className="w-8 h-8 rounded-full mr-3"
              src={row.picture}
              alt={row.name}
            />
          )}
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value: string) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
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
      key: 'lastLoginAt',
      label: 'Last Login',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: User) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUserAction(row._id, row.isActive ? 'deactivate' : 'activate')}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          {row.role !== 'admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUserAction(row._id, 'promote')}
            >
              Make Admin
            </Button>
          )}
          {row.role === 'admin' && session?.user?.email !== row.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUserAction(row._id, 'demote')}
            >
              Remove Admin
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Check if current user is admin
  const isAdmin = session?.user?.role === 'admin';

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto py-8">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600">Manage user access and permissions</p>
              </div>
              <Button onClick={() => setShowInviteModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite User
              </Button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Users ({users.length})
                </h2>
                <Button variant="outline" onClick={fetchUsers}>
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="p-6">
                <Loading />
              </div>
            ) : users.length > 0 ? (
              <DataTable
                data={users}
                columns={columns}
                loading={loading}
              />
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No users found.</p>
              </div>
            )}
          </div>

          {/* Invite User Modal */}
          <Modal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            title="Invite New User"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="user@ably.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only @ably.com email addresses are allowed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteUser}
                  disabled={!inviteEmail || processingInvite}
                  loading={processingInvite}
                >
                  Send Invite
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </ProtectedRoute>
  );
}