'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Settings as SettingsIcon, Bell, Eye, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePrivacyModeChange = async (mode: 'standard' | 'privacy') => {
    try {
      setError('');
      const response = await authAPI.updateProfile({ privacyMode: mode });
      updateUser(response.data.user);
      setSuccess('Privacy mode updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update privacy mode');
    }
  };

  const handleConfidenceThresholdChange = async (threshold: number) => {
    try {
      setError('');
      const response = await authAPI.updateProfile({ confidenceThreshold: threshold });
      updateUser(response.data.user);
      setSuccess('Confidence threshold updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update threshold');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your preferences and application settings
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" onClose={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      {success && (
        <div className="mb-6">
          <Alert variant="success" onClose={() => setSuccess('')}>
            {success}
          </Alert>
        </div>
      )}

      <div className="space-y-6">
        {/* Privacy Mode */}
        <Card>
          <div className="flex items-center mb-6">
            <Eye className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Privacy Mode</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose how your scan results are handled and displayed.
            </p>

            <div className="space-y-3">
              <div
                onClick={() => handlePrivacyModeChange('standard')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  user?.privacyMode === 'standard'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Standard Mode
                    </h3>
                    <p className="text-sm text-gray-600">
                      Show all match details including source URLs and images
                    </p>
                  </div>
                  {user?.privacyMode === 'standard' && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              </div>

              <div
                onClick={() => handlePrivacyModeChange('privacy')}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  user?.privacyMode === 'privacy'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Privacy Mode
                    </h3>
                    <p className="text-sm text-gray-600">
                      Blur images and hide sensitive information in results
                    </p>
                  </div>
                  {user?.privacyMode === 'privacy' && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Confidence Threshold */}
        <Card>
          <div className="flex items-center mb-6">
            <SettingsIcon className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Scan Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Confidence Threshold: {user?.confidenceThreshold || 85}%
              </label>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={user?.confidenceThreshold || 85}
                onChange={(e) =>
                  handleConfidenceThresholdChange(parseInt(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50% (More matches)</span>
                <span>100% (Fewer matches)</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Lower thresholds will find more matches but may include false
                positives. Higher thresholds are more accurate but may miss some
                matches.
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center mb-6">
            <Bell className="h-6 w-6 text-orange-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Notifications
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure how you want to be notified about scan results and
              matches.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Email Notifications
                  </h3>
                  <p className="text-sm text-gray-600">
                    Receive email when scans complete
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Match Notifications
                  </h3>
                  <p className="text-sm text-gray-600">
                    Get notified immediately when matches are found
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card>
          <div className="flex items-center mb-6">
            <Trash2 className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Danger Zone</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete your account, there is no going back. All your
                data, including reference photos and scan history, will be
                permanently deleted.
              </p>
              <Button variant="danger" size="sm">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
