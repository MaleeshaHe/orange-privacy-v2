'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Image,
  Scan,
  FileSearch,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Reference Photos', href: '/dashboard/photos', icon: Image },
  { name: 'Scans', href: '/dashboard/scans', icon: Scan },
  { name: 'Results', href: '/dashboard/results', icon: FileSearch },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 h-screen">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 bg-gray-800">
        <h1 className="text-2xl font-bold text-orange-500">OrangePrivacy</h1>
      </div>

      {/* User info */}
      <div className="flex items-center px-4 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 text-white font-semibold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-white">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                {
                  'bg-gray-800 text-white': isActive,
                  'text-gray-300 hover:bg-gray-700 hover:text-white': !isActive,
                }
              )}
            >
              <Icon
                className={clsx('mr-3 h-5 w-5 flex-shrink-0', {
                  'text-orange-500': isActive,
                  'text-gray-400 group-hover:text-gray-300': !isActive,
                })}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
          Logout
        </button>
      </div>
    </div>
  );
}
