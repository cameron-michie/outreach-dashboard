"use client";

import { useState, useEffect } from "react";
import { Button, Input, Loading } from "@/components/ui";
import { Header } from "@/components/ui/header";
import { ProtectedRoute } from "@/components/auth";
import { useSession } from "next-auth/react";

interface UserSettings {
  requireApproval: boolean;
  emailSignature: string;
  defaultSchedulingDelay: number; // hours
  autoFollowUpEnabled: boolean;
  followUpDelay: number; // days
  maxDailyEmails: number;
  timezone: string;
  notificationSettings: {
    emailApprovals: boolean;
    campaignUpdates: boolean;
    weeklyReports: boolean;
  };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings>({
    requireApproval: true,
    emailSignature: '',
    defaultSchedulingDelay: 24,
    autoFollowUpEnabled: false,
    followUpDelay: 3,
    maxDailyEmails: 10,
    timezone: 'UTC',
    notificationSettings: {
      emailApprovals: true,
      campaignUpdates: true,
      weeklyReports: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/user/settings');
      const data = await response.json();

      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingChange = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof UserSettings],
          [child]: value,
        },
      }));
    } else {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your outreach preferences and notifications</p>
          </div>

          {loading ? (
            <Loading />
          ) : (
            <div className="space-y-6">
              {/* Campaign Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Require Approval</h3>
                      <p className="text-sm text-gray-500">All emails must be approved before sending</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.requireApproval}
                        onChange={(e) => handleSettingChange('requireApproval', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Scheduling Delay (hours)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={settings.defaultSchedulingDelay}
                        onChange={(e) => handleSettingChange('defaultSchedulingDelay', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Daily Emails
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.maxDailyEmails}
                        onChange={(e) => handleSettingChange('maxDailyEmails', parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Signature
                    </label>
                    <textarea
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={4}
                      placeholder="Best Wishes,&#10;Your Name"
                      value={settings.emailSignature}
                      onChange={(e) => handleSettingChange('emailSignature', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Follow-up Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Follow-up Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Auto Follow-up</h3>
                      <p className="text-sm text-gray-500">Automatically schedule follow-up emails</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.autoFollowUpEnabled}
                        onChange={(e) => handleSettingChange('autoFollowUpEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {settings.autoFollowUpEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up Delay (days)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="30"
                        value={settings.followUpDelay}
                        onChange={(e) => handleSettingChange('followUpDelay', parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email Approval Notifications</h3>
                      <p className="text-sm text-gray-500">Get notified when emails need approval</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.notificationSettings.emailApprovals}
                        onChange={(e) => handleSettingChange('notificationSettings.emailApprovals', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Campaign Updates</h3>
                      <p className="text-sm text-gray-500">Get notified about campaign progress</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.notificationSettings.campaignUpdates}
                        onChange={(e) => handleSettingChange('notificationSettings.campaignUpdates', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Weekly Reports</h3>
                      <p className="text-sm text-gray-500">Receive weekly campaign performance reports</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.notificationSettings.weeklyReports}
                        onChange={(e) => handleSettingChange('notificationSettings.weeklyReports', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Profile Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <Input
                        type="text"
                        value={session?.user?.name || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Name is managed through Google OAuth</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={session?.user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email is managed through Google OAuth</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Australia/Sydney">Sydney</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={fetchSettings}>
                  Reset to Saved
                </Button>
                <Button onClick={saveSettings} disabled={saving} loading={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>

              {saveMessage && (
                <div className={`text-center p-2 rounded ${
                  saveMessage.includes('success') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                }`}>
                  {saveMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}