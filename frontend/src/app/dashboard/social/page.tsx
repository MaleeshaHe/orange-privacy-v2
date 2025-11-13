'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { socialMediaAPI } from '@/lib/api';
import { Facebook, Instagram, RefreshCw, Unlink, CheckCircle, AlertCircle } from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: 'facebook' | 'instagram';
  username: string;
  displayName: string;
  profileUrl: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export default function SocialPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<'facebook' | 'instagram' | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await socialMediaAPI.getAll();
      setAccounts(response.data.socialAccounts || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: 'facebook' | 'instagram') => {
    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    try {
      setConnecting(true);
      setError('');

      if (provider === 'facebook') {
        await socialMediaAPI.connectFacebook({ accessToken });
      } else {
        await socialMediaAPI.connectInstagram({ accessToken });
      }

      setSuccess(`${provider === 'facebook' ? 'Facebook' : 'Instagram'} account connected successfully!`);
      setShowConnectModal(null);
      setAccessToken('');
      await fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to connect ${provider} account`);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      setSyncing(accountId);
      setError('');
      const response = await socialMediaAPI.sync(accountId);
      setSuccess(`Synced ${response.data.itemCount} media items successfully!`);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync account');
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) {
      return;
    }

    try {
      setError('');
      await socialMediaAPI.disconnect(accountId);
      setSuccess('Account disconnected successfully!');
      await fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disconnect account');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'facebook':
        return <Facebook className="h-8 w-8 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-8 w-8 text-pink-600" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Social Media Accounts</h1>
        <p className="mt-2 text-gray-600">
          Connect your social media accounts to scan for photos containing your face.
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError('')} className="mb-6">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} className="mb-6">
          {success}
        </Alert>
      )}

      {/* Connect New Account */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Connect New Account
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setShowConnectModal('facebook')}
            className="flex items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Facebook className="h-8 w-8 text-blue-600 mr-3" />
            <span className="text-lg font-medium text-gray-900">Connect Facebook</span>
          </button>
          <button
            onClick={() => setShowConnectModal('instagram')}
            className="flex items-center justify-center p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors"
          >
            <Instagram className="h-8 w-8 text-pink-600 mr-3" />
            <span className="text-lg font-medium text-gray-900">Connect Instagram</span>
          </button>
        </div>
      </Card>

      {/* Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Connect {showConnectModal === 'facebook' ? 'Facebook' : 'Instagram'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Enter your access token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Get your access token from{' '}
                {showConnectModal === 'facebook' ? (
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Facebook Graph API Explorer
                  </a>
                ) : (
                  <a
                    href="https://developers.facebook.com/apps/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 hover:underline"
                  >
                    Facebook for Developers
                  </a>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => handleConnect(showConnectModal)}
                isLoading={connecting}
                className="flex-1"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowConnectModal(null);
                  setAccessToken('');
                  setError('');
                }}
                disabled={connecting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Connected Accounts ({accounts.length})
        </h2>

        {loading ? (
          <Card>
            <p className="text-center text-gray-600 py-8">Loading accounts...</p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No social media accounts connected</p>
              <p className="text-sm text-gray-500">
                Connect your Facebook or Instagram account to start scanning for photos.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {accounts.map((account) => (
              <Card key={account.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="mr-4 mt-1">
                      {getProviderIcon(account.provider)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.displayName || account.username}
                        </h3>
                        <Badge variant={account.isActive ? 'success' : 'default'}>
                          {account.isActive ? 'Active' : 'Disconnected'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        @{account.username}
                      </p>
                      <a
                        href={account.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-600 hover:underline"
                      >
                        View Profile
                      </a>
                      {account.lastSyncedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last synced: {new Date(account.lastSyncedAt).toLocaleString()}
                        </p>
                      )}
                      {!account.lastSyncedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Not yet synced
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {account.isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        isLoading={syncing === account.id}
                        disabled={!!syncing}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {syncing === account.id ? 'Syncing...' : 'Sync'}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={!!syncing}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              How Social Media Scanning Works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Connect your Facebook or Instagram account using an access token</li>
              <li>We sync your photos and photos you're tagged in</li>
              <li>When you run a scan, we use AWS Rekognition to detect faces</li>
              <li>You'll be notified of any matches found in your social media photos</li>
              <li>You can disconnect your account at any time</li>
            </ul>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
