'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { socialMediaAPI } from '@/lib/api';
import {
  Facebook,
  Instagram,
  RefreshCw,
  Unlink,
  AlertCircle,
  ExternalLink,
  Shield,
  CheckCircle2,
  Share2,
  Settings,
  Lock,
  Code,
} from 'lucide-react';

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

interface OAuthStatus {
  facebook: {
    configured: boolean;
    missingFields: string[];
  };
  instagram: {
    configured: boolean;
    missingFields: string[];
  };
}

export default function SocialPage() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
    checkOAuthStatus();

    // Check for OAuth callback messages from URL
    const errorParam = searchParams?.get('error');
    const successParam = searchParams?.get('success');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      window.history.replaceState({}, '', '/dashboard/social');
    }

    if (successParam) {
      setSuccess(decodeURIComponent(successParam));
      window.history.replaceState({}, '', '/dashboard/social');
      fetchAccounts();
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

  const checkOAuthStatus = async () => {
    try {
      setStatusLoading(true);
      const response = await socialMediaAPI.getOAuthStatus();
      setOauthStatus(response.data);
    } catch (err: any) {
      console.error('Failed to check OAuth status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOAuthConnect = async (provider: 'facebook' | 'instagram') => {
    try {
      setError('');
      setConnecting(true);

      const response =
        provider === 'facebook'
          ? await socialMediaAPI.getFacebookOAuthUrl()
          : await socialMediaAPI.getInstagramOAuthUrl();

      const { authUrl } = response.data;

      // Redirect to OAuth URL
      window.location.href = authUrl;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || `Failed to initiate ${provider} OAuth`;
      setError(errorMessage);
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

  const isAnyOAuthConfigured =
    oauthStatus?.facebook.configured || oauthStatus?.instagram.configured;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Social Media Accounts</h1>
        <p className="mt-2 text-gray-600">
          Connect your Facebook and Instagram accounts using secure OAuth authentication.
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

      {/* OAuth Not Configured - Critical Setup Required */}
      {!statusLoading && !isAnyOAuthConfigured && (
        <Card className="mb-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Settings className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                OAuth Configuration Required
              </h3>
              <p className="text-sm text-red-800 mb-4">
                Social media connections require OAuth authentication to be configured. The administrator needs to set up Facebook and Instagram app credentials.
              </p>

              <div className="bg-white rounded-lg border border-red-200 p-4 mb-4">
                <div className="flex items-start mb-3">
                  <Lock className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Why OAuth?</h4>
                    <p className="text-sm text-gray-700">
                      OAuth is the industry-standard secure authorization protocol. It allows users to grant access without sharing passwords and provides full control over permissions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    Setup Instructions
                  </h4>
                  <ol className="space-y-2 text-sm text-red-800">
                    <li className="flex items-start">
                      <span className="font-bold mr-2">1.</span>
                      <div>
                        Create Facebook Developer Apps:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Visit{' '}
                            <a
                              href="https://developers.facebook.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium hover:text-red-900"
                            >
                              Facebook for Developers
                            </a>
                          </li>
                          <li>Create a new app (Consumer type)</li>
                          <li>Add "Facebook Login" product</li>
                          <li>Add "Instagram Basic Display" product (for Instagram)</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">2.</span>
                      <div>
                        Configure OAuth Settings:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>Set Valid OAuth Redirect URIs to: <code className="bg-red-100 px-1 rounded text-xs">http://localhost:5000/api/social-media/facebook/callback</code></li>
                          <li>Copy your App ID and App Secret</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">3.</span>
                      <div>
                        Update Backend Environment Variables in{' '}
                        <code className="bg-red-100 px-1 rounded text-xs font-mono">backend/.env</code>:
                        <div className="bg-gray-900 text-gray-100 rounded p-3 mt-2 text-xs font-mono overflow-x-auto">
                          <div>FACEBOOK_APP_ID=your_app_id_here</div>
                          <div>FACEBOOK_APP_SECRET=your_app_secret_here</div>
                          <div>FACEBOOK_CALLBACK_URL=http://localhost:5000/api/social-media/facebook/callback</div>
                          <div className="mt-2">INSTAGRAM_CLIENT_ID=your_instagram_app_id</div>
                          <div>INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret</div>
                          <div>INSTAGRAM_CALLBACK_URL=http://localhost:5000/api/social-media/instagram/callback</div>
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="font-bold mr-2">4.</span>
                      <div>
                        Restart the backend server:
                        <div className="bg-gray-900 text-gray-100 rounded p-3 mt-2 text-xs font-mono">
                          cd backend && npm run dev
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800">
                      <strong>Need detailed help?</strong> See the complete setup guide at{' '}
                      <a
                        href="https://github.com/yourusername/orange-privacy-v2/blob/main/OAUTH_SETUP.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        OAUTH_SETUP.md
                      </a>
                      {' '}in the project root.
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={checkOAuthStatus}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Configuration
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Partial Configuration Warning */}
      {!statusLoading && isAnyOAuthConfigured &&
        (!oauthStatus?.facebook.configured || !oauthStatus?.instagram.configured) && (
        <Card className="mb-6 bg-amber-50 border-amber-300">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-900 mb-1">
                Partial OAuth Configuration
              </h3>
              <p className="text-sm text-amber-800 mb-2">
                {!oauthStatus?.facebook.configured &&
                  `Facebook OAuth is not configured. Missing: ${oauthStatus?.facebook.missingFields.join(', ')}`}
                {!oauthStatus?.facebook.configured && !oauthStatus?.instagram.configured && ' | '}
                {!oauthStatus?.instagram.configured &&
                  `Instagram OAuth is not configured. Missing: ${oauthStatus?.instagram.missingFields.join(', ')}`}
              </p>
              <p className="text-xs text-amber-700">
                Configure the missing credentials in <code className="bg-amber-100 px-1 rounded">backend/.env</code> to enable all providers.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Connect New Account */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Share2 className="h-5 w-5 mr-2 text-orange-600" />
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
              {oauthStatus?.facebook.configured && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            <Button
              variant="primary"
              onClick={() => handleOAuthConnect('facebook')}
              disabled={connecting || !oauthStatus?.facebook.configured}
              className="w-full"
            >
              <Facebook className="h-5 w-5 mr-2" />
              {oauthStatus?.facebook.configured ? 'Connect with Facebook' : 'Not Configured'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            {!oauthStatus?.facebook.configured && (
              <p className="text-xs text-gray-500 text-center">
                Administrator needs to configure OAuth
              </p>
            )}
          </div>

          {/* Instagram */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Instagram className="h-6 w-6 text-pink-600 mr-2" />
                <span className="font-medium text-gray-900">Instagram</span>
              </div>
              {oauthStatus?.instagram.configured && (
                <Badge variant="success" size="sm">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
            </div>
            <Button
              variant="primary"
              onClick={() => handleOAuthConnect('instagram')}
              disabled={connecting || !oauthStatus?.instagram.configured}
              className="w-full"
            >
              <Instagram className="h-5 w-5 mr-2" />
              {oauthStatus?.instagram.configured ? 'Connect with Instagram' : 'Not Configured'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            {!oauthStatus?.instagram.configured && (
              <p className="text-xs text-gray-500 text-center">
                Administrator needs to configure OAuth
              </p>
            )}
          </div>
        </div>
      </Card>

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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mb-4">
                <Share2 className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected yet</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {isAnyOAuthConfigured
                  ? 'Connect your social media accounts to scan for photos containing your face.'
                  : 'OAuth configuration is required before you can connect accounts.'}
              </p>
              {isAnyOAuthConfigured && (
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1 text-green-600" />
                    <span>Secure OAuth</span>
                  </div>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center">
                    <Lock className="h-4 w-4 mr-1 text-green-600" />
                    <span>GDPR Compliant</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {accounts.map((account) => (
              <Card key={account.id}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <div className="mr-4 mt-1">{getProviderIcon(account.provider)}</div>
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
                      <p className="text-sm text-gray-600 mb-2">@{account.username}</p>
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
                        <RefreshCw
                          className={`h-4 w-4 mr-1 ${syncing === account.id ? 'animate-spin' : ''}`}
                        />
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

      {/* Info Card - Only show if OAuth is configured */}
      {isAnyOAuthConfigured && (
        <Card className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                How Social Media Scanning Works
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-blue-800 mb-1">Connection:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-2">
                    <li>Click "Connect with Facebook/Instagram" above</li>
                    <li>You'll be redirected to authorize OrangePrivacy</li>
                    <li>Grant permissions to access your photos</li>
                    <li>You'll be redirected back automatically</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-blue-800 mb-1">After Connection:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside ml-2">
                    <li>Click "Sync" to fetch your photos and tagged photos</li>
                    <li>Photos are stored securely for facial recognition</li>
                    <li>Run scans to find matches across social media</li>
                    <li>View and manage results in the Results page</li>
                    <li>Disconnect anytime to remove all data</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-blue-700">
                    <div className="flex items-center">
                      <Lock className="h-3 w-3 mr-1 text-green-600" />
                      OAuth 2.0 Secured
                    </div>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      No password sharing
                    </div>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                      Full control
                    </div>
                    <div className="flex items-center">
                      <Shield className="h-3 w-3 mr-1 text-green-600" />
                      GDPR compliant
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
