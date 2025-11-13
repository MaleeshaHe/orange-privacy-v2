'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { scanJobAPI, refPhotoAPI } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [refPhotos, setRefPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadDashboardData();
  }, [isAuthenticated, router]);

  const loadDashboardData = async () => {
    try {
      const [statsRes, photosRes] = await Promise.all([
        scanJobAPI.getStats(),
        refPhotoAPI.getAll(),
      ]);
      setStats(statsRes.data);
      setRefPhotos(photosRes.data.refPhotos);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">OrangePrivacy</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName || user?.email}
              </span>
              {user?.role === 'admin' && (
                <a href="/admin" className="text-sm text-primary-600 hover:text-primary-700">
                  Admin Panel
                </a>
              )}
              <button onClick={handleLogout} className="btn-secondary text-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {!user?.biometricConsentGiven && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-yellow-800">Biometric Consent Required</h3>
            <p className="mt-2 text-sm text-yellow-700">
              You must give consent for biometric scanning before using OrangePrivacy features.
            </p>
            <a href="/consent" className="mt-3 inline-block btn-primary text-sm">
              Give Consent
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Total Scans</h3>
            <p className="mt-2 text-3xl font-bold text-primary-600">
              {stats?.totalScans || 0}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Total Matches</h3>
            <p className="mt-2 text-3xl font-bold text-primary-600">
              {stats?.totalMatches || 0}
            </p>
          </div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Reference Photos</h3>
            <p className="mt-2 text-3xl font-bold text-primary-600">
              {refPhotos.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <a href="/photos" className="block btn-primary text-center">
                Manage Reference Photos
              </a>
              <a href="/scans" className="block btn-primary text-center">
                View Scan History
              </a>
              <a href="/scans/new" className="block btn-primary text-center">
                Start New Scan
              </a>
              <a href="/social" className="block btn-secondary text-center">
                Connect Social Media
              </a>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            {stats?.stats?.map((stat: any, index: number) => (
              <div key={index} className="flex justify-between py-2 border-b">
                <span className="text-gray-600 capitalize">{stat.status}</span>
                <span className="font-medium">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
