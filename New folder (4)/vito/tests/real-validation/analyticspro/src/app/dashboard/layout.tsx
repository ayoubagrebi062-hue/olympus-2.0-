'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Demo Mode Banner */}
        <div className="bg-yellow-400 dark:bg-yellow-600 px-4 py-2 text-center">
          <span className="text-yellow-900 dark:text-yellow-100 text-sm font-medium">
            Demo Mode - Data is not persisted. Auth and email services not connected.
          </span>
        </div>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
