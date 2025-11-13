'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { socialMediaAPI } from '@/lib/api';
import { Facebook, Instagram, RefreshCw, Unlink, AlertCircle, Key, ExternalLink, Shield, CheckCircle2, Share2 } from 'lucide-react';

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
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showManualTokenModal, setShowManualTokenModal] = useState<'facebook' | 'instagram' | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState({ facebook: true, instagram: true });

  useEffect(() => {
    fetchAccounts();

    // Check for OAuth callback messages from URL
    const errorParam = searchParams?.get('error');
    const successParam = searchParams?.get('success');

    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      setError(decodedError);

      // Check if OAuth is not configured
      if (decodedError.includes('OAuth not configured')) {
        if (decodedError.includes('Facebook')) {
          setOauthConfigured(prev => ({ ...prev, facebook: false }));
        } else if (decodedError.includes('Instagram')) {
          setOauthConfigured(prev => ({ ...prev, instagram: false }));
        }
      }

      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/social');
    }

    if (successParam) {
      setSuccess(decodeURIComponent(successParam));
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/social');
      fetchAccounts(); // Refresh accounts list
    }
  }, [searchParams]);

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

  const handleOAuthConnect = async (provider: 'facebook' | 'instagram') => {
    try {
      setError('');
      setConnecting(true);

      // Get OAuth URL from backend
      const response = provider === 'facebook'
        ? await socialMediaAPI.getFacebookOAuthUrl()
        : await socialMediaAPI.getInstagramOAuthUrl();

      const { authUrl } = response.data;

      // Redirect to OAuth URL (full page redirect instead of popup for better compatibility)
      window.location.href = authUrl;

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || `Failed to initiate ${provider} OAuth`;
      setError(errorMessage);

      // Check if OAuth is not configured
      if (errorMessage.includes('OAuth not configured')) {
        if (provider === 'facebook') {
          setOauthConfigured(prev => ({ ...prev, facebook: false }));
        } else {
          setOauthConfigured(prev => ({ ...prev, instagram: false }));
        }
      }

      setConnecting(false);
    }
  };

  const handleManualTokenConnect = async (provider: 'facebook' | 'instagram') => {
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
      setShowManualTokenModal(null);
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

      {/* OAuth Not Configured Warning */}
      {(!oauthConfigured.facebook || !oauthConfigured.instagram) && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-900 mb-1">
                OAuth Not Configured
              </h3>
              <p className="text-sm text-amber-800 mb-3">
                {!oauthConfigured.facebook && !oauthConfigured.instagram ? (
                  'Facebook and Instagram OAuth are not configured. '
                ) : !oauthConfigured.facebook ? (
                  'Facebook OAuth is not configured. '
                ) : (
                  'Instagram OAuth is not configured. '
                )}
                The "Connect" buttons require Facebook Developer app credentials to be set in the backend.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-amber-800 font-medium">You have two options:</p>
                <div className="ml-4 space-y-2">
                  <div className="flex items-start">
                    <span className="text-amber-700 mr-2">1.</span>
                    <div>
                      <span className="text-sm text-amber-800 font-medium">Quick Solution:</span>
                      <p className="text-sm text-amber-700">
                        Use the <strong>"Manual Token"</strong> button below to connect with an access token from{' '}
                        <a
                          href="https://developers.facebook.com/tools/explorer/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-amber-900"
                        >
                          Facebook Graph API Explorer
                        </a>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-amber-700 mr-2">2.</span>
                    <div>
                      <span className="text-sm text-amber-800 font-medium">Full OAuth Setup:</span>
                      <p className="text-sm text-amber-700">
                        Follow the{' '}
                        <a
                          href="/OAUTH_SETUP.md"
                          target="_blank"
                          className="underline hover:text-amber-900"
                        >
                          OAUTH_SETUP.md guide
                        </a>
                        {' '}to configure Facebook Developer app credentials in <code className="bg-amber-100 px-1 rounded">backend/.env</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Connect New Account */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Connect New Account
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Facebook */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Facebook className="h-6 w-6 text-blue-600 mr-2" />
                <span className="font-medium text-gray-900">Facebook</span>
              </div>
              {oauthConfigured.facebook && (
                <Badge variant="success" size="sm">
                  <Shield className="h-3 w-3 mr-1" />
                  OAuth Ready
                </Badge>
              )}
            </div>
            <button
              onClick={() => handleOAuthConnect('facebook')}
              disabled={connecting}
              className="flex items-center justify-center w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Facebook className="h-6 w-6 text-blue-600 mr-2" />
              <span className="text-base font-medium text-gray-900 group-hover:text-blue-700">
                {oauthConfigured.facebook ? 'Connect with OAuth' : 'Connect (OAuth not set up)'}
              </span>
              <ExternalLink className="h-4 w-4 ml-2 text-gray-400 group-hover:text-blue-600" />
            </button>
            <button
              onClick={() => setShowManualTokenModal('facebook')}
              className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors border border-gray-200"
            >
              <Key className="h-4 w-4 mr-1" />
              Use Manual Token
            </button>
          </div>

          {/* Instagram */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Instagram className="h-6 w-6 text-pink-600 mr-2" />
                <span className="font-medium text-gray-900">Instagram</span>
              </div>
              {oauthConfigured.instagram && (
                <Badge variant="success" size="sm">
                  <Shield className="h-3 w-3 mr-1" />
                  OAuth Ready
                </Badge>
              )}
            </div>
            <button
              onClick={() => handleOAuthConnect('instagram')}
              disabled={connecting}
              className="flex items-center justify-center w-full p-4 border-2 border-pink-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Instagram className="h-6 w-6 text-pink-600 mr-2" />
              <span className="text-base font-medium text-gray-900 group-hover:text-pink-700">
                {oauthConfigured.instagram ? 'Connect with OAuth' : 'Connect (OAuth not set up)'}
              </span>
              <ExternalLink className="h-4 w-4 ml-2 text-gray-400 group-hover:text-pink-600" />
            </button>
            <button
              onClick={() => setShowManualTokenModal('instagram')}
              className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors border border-gray-200"
            >
              <Key className="h-4 w-4 mr-1" />
              Use Manual Token
            </button>
          </div>
        </div>
      </Card>

      {/* Manual Token Modal */}
      {showManualTokenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Connect {showManualTokenModal === 'facebook' ? 'Facebook' : 'Instagram'} Manually
              </h3>
              {showManualTokenModal === 'facebook' ? (
                <Facebook className="h-6 w-6 text-blue-600" />
              ) : (
                <Instagram className="h-6 w-6 text-pink-600" />
              )}
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  This method requires you to manually generate an access token from Facebook's developer tools.
                  The OAuth method (main button) is easier but requires backend configuration.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Paste your access token here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">How to get your access token:</p>
                {showManualTokenModal === 'facebook' ? (
                  <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside ml-2">
                    <li>
                      Go to{' '}
                      <a
                        href="https://developers.facebook.com/tools/explorer/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        Graph API Explorer
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </li>
                    <li>Click "Generate Access Token"</li>
                    <li>Grant permissions: <code className="bg-gray-100 px-1 rounded text-xs">public_profile, user_photos</code></li>
                    <li>Copy the token and paste it above</li>
                  </ol>
                ) : (
                  <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside ml-2">
                    <li>
                      Go to{' '}
                      <a
                        href="https://developers.facebook.com/apps/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:underline inline-flex items-center"
                      >
                        Facebook for Developers
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </li>
                    <li>Select your app → Instagram Basic Display</li>
                    <li>Generate a User Token for a test user</li>
                    <li>Copy the token and paste it above</li>
                  </ol>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => handleManualTokenConnect(showManualTokenModal)}
                isLoading={connecting}
                disabled={!accessToken.trim()}
                className="flex-1"
              >
                {connecting ? 'Connecting...' : 'Connect Account'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowManualTokenModal(null);
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
          Connected Accounts {accounts.length > 0 && `(${accounts.length})`}
        </h2>

        {loading ? (
          <Card>
            <p className="text-center text-gray-600 py-8">Loading accounts...</p>
          </Card>
        ) : accounts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Share2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected yet</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Connect your Facebook or Instagram account to scan for photos containing your face across your social media.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Secure OAuth authentication</span>
                <span className="text-gray-300">•</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>GDPR compliant</span>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {accounts.map((account) => (
              <Card key={account.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="mr-4 mt-1">
                      {getProviderIcon(account.provider)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.displayName || account.username}
                        </h3>
                        <Badge variant={account.isActive ? 'success' : 'default'}>
                          {account.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            'Disconnected'
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        @{account.username}
                      </p>
                      <div className="flex flex-wrap gap-3 items-center">
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-orange-600 hover:text-orange-700 inline-flex items-center"
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                        {account.lastSyncedAt && (
                          <span className="text-xs text-gray-500">
                            Last synced: {new Date(account.lastSyncedAt).toLocaleString()}
                          </span>
                        )}
                        {!account.lastSyncedAt && (
                          <Badge variant="default" size="sm">
                            Not yet synced
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Connected on {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {account.isActive && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSync(account.id)}
                        isLoading={syncing === account.id}
                        disabled={!!syncing}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${syncing === account.id ? 'animate-spin' : ''}`} />
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
      <Card className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              How Social Media Scanning Works
            </h3>
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-blue-800 mb-1">Connection Methods:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-2">
                  <li><strong>OAuth (Recommended):</strong> Secure one-click connection - requires backend setup</li>
                  <li><strong>Manual Token:</strong> Works immediately - paste a token from Facebook's developer tools</li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-blue-800 mb-1">After Connection:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-2">
                  <li>Click "Sync" to fetch your photos and tagged photos</li>
                  <li>Photos are temporarily stored for facial recognition scanning</li>
                  <li>Run scans from the Scans page to find matches</li>
                  <li>View results and manage findings in the Results page</li>
                  <li>Disconnect anytime to remove all synced data</li>
                </ul>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center gap-3 text-xs text-blue-700">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    End-to-end encrypted
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    GDPR compliant
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                    Your data, your control
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
