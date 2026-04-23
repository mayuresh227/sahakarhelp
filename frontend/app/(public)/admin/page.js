'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'analytics'

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    setUpdating(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(users.map(user => 
          user._id === userId ? { ...user, role: newRole } : user
        ));
      } else {
        alert('Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role', error);
    } finally {
      setUpdating(prev => ({ ...prev, [userId]: false }));
    }
  };

  const updateUserPlan = async (userId, newPlan) => {
    setUpdating(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) {
        setUsers(users.map(user => 
          user._id === userId ? { ...user, plan: newPlan } : user
        ));
      } else {
        alert('Failed to update plan');
      }
    } catch (error) {
      console.error('Error updating plan', error);
    } finally {
      setUpdating(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null; // will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <div className="text-sm text-gray-600">
            Total Users: <span className="font-bold">{users.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="text-gray-600 text-sm">Manage user roles and plans.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
                          <div className="text-sm text-gray-500">ID: {user._id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user._id, e.target.value)}
                        disabled={updating[user._id]}
                        className="block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.plan}
                        onChange={(e) => updateUserPlan(user._id, e.target.value)}
                        disabled={updating[user._id]}
                        className="block w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-gray-900">{user.usageCount || 0} uses</div>
                      <div className="text-gray-500 text-xs">Last reset: {new Date(user.lastResetAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => fetchUsers()}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete user ${user.email}?`)) {
                            // TODO: implement delete
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{users.length}</span> users
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Refresh List
                </button>
                <button
                  onClick={() => alert('Export feature not yet implemented')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">User Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Free Users</span>
                <span className="font-bold">{users.filter(u => u.plan === 'free').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pro Users</span>
                <span className="font-bold">{users.filter(u => u.plan === 'pro').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Admins</span>
                <span className="font-bold">{users.filter(u => u.role === 'admin').length}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Tool Usage Overview</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tool Executions</span>
                <span className="font-bold">{users.reduce((sum, u) => sum + (u.usageCount || 0), 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg per User</span>
                <span className="font-bold">
                  {users.length > 0 ? (users.reduce((sum, u) => sum + (u.usageCount || 0), 0) / users.length).toFixed(1) : 0}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/tools')}
                className="w-full text-left p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Manage Tools
              </button>
              <button
                onClick={() => router.push('/admin/analytics')}
                className="w-full text-left p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                View Analytics
              </button>
              <button
                onClick={() => alert('Feature coming soon')}
                className="w-full text-left p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Send Announcement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}