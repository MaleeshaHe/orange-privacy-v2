'use client';

import { Suspense } from 'react';
import ResultsPageContent from './ResultsPageContent';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function ResultsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
        <ResultsPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
