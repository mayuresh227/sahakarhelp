'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  // Auth temporarily disabled - show message instead
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'analytics'

  useEffect(() => {
    // No redirect during temporary disable
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Auth disabled notice */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Authentication Temporarily Disabled</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Admin features are temporarily unavailable while authentication is disabled. Please check back later.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <div className="text-sm text-gray-600">
            Total Users: <span className="font-bold">0</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Analytics
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">
              {activeTab === 'users' ? 'User Management' : 'Analytics Dashboard'}
            </h2>
            <p className="text-gray-600 text-sm">
              {activeTab === 'users' 
                ? 'Admin features are temporarily disabled.' 
                : 'Analytics features are temporarily disabled.'}
            </p>
          </div>
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">
              User authentication is temporarily disabled. Admin features will be available once authentication is re-enabled.
            </p>
            <div className="text-sm text-gray-500">
              <p>All tools remain available without authentication.</p>
            </div>
          </div>
        </div>

        {/* Info boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Authentication</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Disabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Disabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tools</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Operational</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.open('/tools', '_self')}
                className="w-full text-left p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium"
              >
                Browse Tools
              </button>
              <button
                onClick={() => window.open('/test', '_self')}
                className="w-full text-left p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Test API
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Temporary Status</h3>
            <p className="text-gray-600 text-sm">
              This is a temporary state for maintenance. All core tools (PDF, GST, EMI, Calculator) remain fully functional.
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Note:</strong> User accounts, payments, and analytics are temporarily unavailable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}