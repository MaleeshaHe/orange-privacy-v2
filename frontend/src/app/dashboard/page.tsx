'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/ToastContainer';
import { scanJobAPI, refPhotoAPI, authAPI } from '@/lib/api';
import {
  Image,
  Scan,
  FileSearch,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Upload,
  Search,
  Eye
} from 'lucide-react';

interface ScanJob {
  id: string;
  scanType: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalMatchesFound?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPhotos: 0,
    activePhotos: 0,
    totalScans: 0,
    activeScans: 0,
    totalMatches: 0,
  });
  const [recentScans, setRecentScans] = useState<ScanJob[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [photosRes, statsRes, scansRes, profileRes] = await Promise.all([
        refPhotoAPI.getAll(),
        scanJobAPI.getStats(),
        scanJobAPI.getAll({ limit: 5 }),
        authAPI.getProfile().catch(() => ({ data: { user: { firstName: '' } } })),
      ]);

      const photos = photosRes.data.refPhotos || [];
      setStats({
        totalPhotos: photos.length,
        activePhotos: photos.filter((p: any) => p.isActive).length,
        totalScans: statsRes.data.totalScans || 0,
        activeScans: statsRes.data.activeScans || 0,
        totalMatches: statsRes.data.totalMatches || 0,
      });

      setRecentScans(scansRes.data.scanJobs?.slice(0, 5) || []);
      setUserName(profileRes.data.user?.firstName || '');
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Load Failed', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'queued':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
      case 'queued':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Scan className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statCards = [
    {
      title: 'Reference Photos',
      value: stats.totalPhotos,
      subtitle: `${stats.activePhotos} active`,
      icon: Image,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      href: '/dashboard/photos',
    },
    {
      title: 'Total Scans',
      value: stats.totalScans,
      subtitle: `${stats.activeScans} in progress`,
      icon: Scan,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      href: '/dashboard/scans',
    },
    {
      title: 'Active Scans',
      value: stats.activeScans,
      subtitle: stats.activeScans > 0 ? 'Processing now' : 'None running',
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      href: '/dashboard/scans',
    },
    {
      title: 'Total Matches',
      value: stats.totalMatches,
      subtitle: 'Across all scans',
      icon: FileSearch,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      href: '/dashboard/results',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {userName ? `Welcome back, ${userName}!` : 'Dashboard'}
        </h1>
        <p className="mt-2 text-gray-600">
          Here's an overview of your privacy monitoring activity
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md" className="animate-pulse">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-gray-200 w-12 h-12" />
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                padding="md"
                className="hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => router.push(stat.href)}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {stat.subtitle}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <div
              onClick={() => router.push('/dashboard/photos')}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Upload Reference Photo
                  </h3>
                  <p className="text-sm text-gray-600">
                    Add photos to monitor across the web
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>

            <div
              onClick={() => router.push('/dashboard/scans')}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Search className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Start New Scan</h3>
                  <p className="text-sm text-gray-600">
                    Scan the web for your photos
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>

            <div
              onClick={() => router.push('/dashboard/results')}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">View Results</h3>
                  <p className="text-sm text-gray-600">
                    Review and manage your scan matches
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Recent Activity
            </h2>
            {recentScans.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/dashboard/scans')}
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {loading ? (
              // Loading skeleton
              <>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 border border-gray-200 rounded-lg animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20" />
                    </div>
                  </div>
                ))}
              </>
            ) : recentScans.length > 0 ? (
              recentScans.map((scan, index) => (
                <div
                  key={scan.id}
                  onClick={() => router.push(`/dashboard/scans`)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer group animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(scan.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 capitalize">
                            {scan.scanType} Scan
                          </p>
                          <Badge
                            size="sm"
                            variant={getStatusColor(scan.status) as any}
                          >
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{formatDate(scan.createdAt)}</span>
                          {scan.status === 'completed' && scan.totalMatchesFound !== undefined && (
                            <span className="flex items-center gap-1">
                              <FileSearch className="h-3 w-3" />
                              {scan.totalMatchesFound} match{scan.totalMatchesFound !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              ))
            ) : (
              // Empty state
              <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  No recent activity
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Start your first scan to monitor your photos
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push('/dashboard/scans')}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Get Started Section (if no data) */}
      {!loading && stats.totalPhotos === 0 && (
        <Card className="mt-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
              <Image className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Get Started with OrangePrivacy
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload your first reference photo to start monitoring your online presence
            </p>
            <Button
              size="lg"
              variant="primary"
              onClick={() => router.push('/dashboard/photos')}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Reference Photo
            </Button>
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
