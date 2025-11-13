'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { scanJobAPI, refPhotoAPI } from '@/lib/api';
import { Image, Scan, FileSearch, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalScans: 0,
    activeScans: 0,
    totalMatches: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [photosRes, statsRes] = await Promise.all([
        refPhotoAPI.getAll(),
        scanJobAPI.getStats(),
      ]);

      setStats({
        totalPhotos: photosRes.data.refPhotos?.length || 0,
        totalScans: statsRes.data.totalScans || 0,
        activeScans: statsRes.data.activeScans || 0,
        totalMatches: statsRes.data.totalMatches || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Reference Photos',
      value: stats.totalPhotos,
      icon: Image,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Scans',
      value: stats.totalScans,
      icon: Scan,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Scans',
      value: stats.activeScans,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Total Matches',
      value: stats.totalMatches,
      icon: FileSearch,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's an overview of your privacy monitoring.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} padding="md">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <a
              href="/dashboard/photos"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    Upload Reference Photo
                  </h3>
                  <p className="text-sm text-gray-600">
                    Add a new photo to monitor
                  </p>
                </div>
                <Image className="h-5 w-5 text-gray-400" />
              </div>
            </a>
            <a
              href="/dashboard/scans"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Start New Scan</h3>
                  <p className="text-sm text-gray-600">
                    Scan the web for your photos
                  </p>
                </div>
                <Scan className="h-5 w-5 text-gray-400" />
              </div>
            </a>
            <a
              href="/dashboard/results"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">View Results</h3>
                  <p className="text-sm text-gray-600">
                    Check your scan matches
                  </p>
                </div>
                <FileSearch className="h-5 w-5 text-gray-400" />
              </div>
            </a>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {stats.activeScans > 0 ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-900">
                      {stats.activeScans} active scan{stats.activeScans !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-orange-700">
                      Scans are currently in progress
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-sm text-gray-600">No recent activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
