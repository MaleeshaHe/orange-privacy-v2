'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Only check authentication after the store has hydrated from localStorage
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Show loading while waiting for the store to hydrate
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If hydrated but not authenticated, show nothing (redirect is in progress)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="py-6 px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
