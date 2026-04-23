'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'admin') {
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }, [status, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Track user activity, tool usage, and system performance</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
            >
              Back to Users
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Refresh Data
            </button>
          </div>
        </div>
        
        <AnalyticsDashboard isAdmin={true} />
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">API Endpoints</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <code className="text-sm font-mono">GET /api/analytics/summary</code>
                <p className="text-sm text-gray-600 mt-1">Get analytics summary (total users, tool usage, daily stats)</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <code className="text-sm font-mono">GET /api/analytics/usage?period=7d</code>
                <p className="text-sm text-gray-600 mt-1">Get usage statistics for charts (period: 7d, 30d, 90d)</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <code className="text-sm font-mono">POST /api/analytics/log</code>
                <p className="text-sm text-gray-600 mt-1">Log custom analytics events from frontend</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Tracking Events</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span>Tool usage (automatically tracked)</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span>User login (tracked via NextAuth)</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <span>API errors (automatically tracked)</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                <span>All API requests (middleware)</span>
              </li>
            </ul>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Analytics data is collected automatically. The system tracks:
                tool executions, user logins, API errors, and response times.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}