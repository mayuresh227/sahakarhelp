'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function DashboardPage() {
  // Auth temporarily disabled - use dummy session
  const session = null;
  const status = 'unauthenticated';
  const [userData, setUserData] = useState(null);
  const [toolUsage, setToolUsage] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No redirect during temporary disable
    // Fetch public data instead
    fetchPublicData();
    fetchToolUsage();
    fetchInvoices();
  }, []);

  const fetchPublicData = async () => {
    try {
      // Since auth is disabled, use guest endpoint or show placeholder
      const res = await fetch('/api/user/public-profile');
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        // Fallback to placeholder data
        setUserData({
          name: 'Guest User',
          email: 'guest@example.com',
          plan: 'free',
          role: 'user'
        });
      }
    } catch (error) {
      console.error('Failed to fetch public data', error);
      // Set placeholder data
      setUserData({
        name: 'Guest User',
        email: 'guest@example.com',
        plan: 'free',
        role: 'user'
      });
    }
  };

  const fetchToolUsage = async () => {
    try {
      const res = await fetch('/api/user/tool-usage');
      if (res.ok) {
        const data = await res.json();
        setToolUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch tool usage', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoice');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  // Use userData from fetchPublicData or placeholder
  const user = userData || { name: 'Guest User', email: 'guest@example.com', plan: 'free', role: 'user' };
  const plan = user.plan || 'free';
  const role = user.role || 'user';

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
                <p>User authentication and personalized features are temporarily unavailable. You are viewing a guest dashboard with limited functionality.</p>
              </div>
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* User Info Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Information</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="ml-4">
                  <p className="font-medium">{user?.name || 'No name'}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Plan</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${plan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {plan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                  {role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              {plan === 'free' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Upgrade to Pro to unlock all tools and remove usage limits.
                  </p>
                  <Link href="/dashboard/upgrade" className="inline-block mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
                    Upgrade Now
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Tool Usage Summary */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tool Usage</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tools used today</span>
                <span className="font-bold">0 / 5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '20%' }}></div>
              </div>
              <p className="text-sm text-gray-500">Free users are limited to 5 tool uses per day.</p>
              <div className="mt-6">
                <h3 className="font-medium mb-2">Recent Usage</h3>
                {toolUsage.length > 0 ? (
                  <ul className="space-y-2">
                    {toolUsage.slice(0, 3).map((usage, idx) => (
                      <li key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        {usage.toolName} - {new Date(usage.timestamp).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No tool usage recorded yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/tools" className="block p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium">
                Browse Tools
              </Link>
              <Link href="/dashboard/settings" className="block p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">
                Account Settings
              </Link>
              {role === 'admin' && (
                <Link href="/admin" className="block p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 font-medium">
                  Admin Panel
                </Link>
              )}
              <button className="w-full p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Invoices</h2>
            <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-800 font-medium">
              View All
            </Link>
          </div>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.slice(0, 5).map((invoice) => (
                    <tr key={invoice._id}>
                      <td className="px-4 py-3 text-sm font-medium">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{invoice.totalAmount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/invoices/${invoice._id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No invoices found.</p>
              <p className="text-sm text-gray-400 mt-2">Invoices will appear here after you generate them using tools.</p>
            </div>
          )}
        </div>

        {/* Tool Usage History */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-6">Tool Usage History</h2>
          {toolUsage.length > 0 ? (
            <div className="space-y-4">
              {toolUsage.map((usage, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium">{usage.toolName}</h4>
                    <p className="text-sm text-gray-500">{usage.description}</p>
                    <p className="text-xs text-gray-400">{new Date(usage.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium">{usage.duration || 'N/A'}</span>
                    <p className="text-xs text-gray-500">success</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No tool usage history yet.</p>
              <p className="text-sm text-gray-400 mt-2">Start using tools to see your history here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}