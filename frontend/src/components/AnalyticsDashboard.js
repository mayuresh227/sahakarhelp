'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboard({ isAdmin = false }) {
  const [summary, setSummary] = useState(null);
  const [dailyUsage, setDailyUsage] = useState([]);
  const [mostUsedTools, setMostUsedTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [period]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      
      // Fetch summary
      const summaryRes = await fetch(`/api/analytics/summary?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!summaryRes.ok) throw new Error('Failed to fetch analytics summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData.summary);
      setDailyUsage(summaryData.dailyUsage || []);
      setMostUsedTools(summaryData.mostUsedTools || []);

      // Fetch usage data for charts
      const usageRes = await fetch(`/api/analytics/usage?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        // Could use this for more detailed charts
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>Error loading analytics: {error}</p>
        <button 
          onClick={fetchAnalyticsData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track user activity, tool usage, and system performance</p>
        </div>
        <div className="flex space-x-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a5.5 5.5 0 01-5.5 5.5" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalUsers || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Tool Usage</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalToolUsage || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Logins</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalLogins || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Errors</p>
              <p className="text-2xl font-bold">{formatNumber(summary?.totalErrors || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
          <div className="h-80">
            {dailyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="Total Actions" />
                  <Line type="monotone" dataKey="toolUsage" stroke="#82ca9d" name="Tool Usage" />
                  <Line type="monotone" dataKey="logins" stroke="#ffc658" name="Logins" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available for the selected period
              </div>
            )}
          </div>
        </div>

        {/* Most Used Tools Chart */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold mb-4">Most Used Tools</h3>
          <div className="h-80">
            {mostUsedTools.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostUsedTools}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Usage Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No tool usage data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tool Breakdown Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Tool Usage Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tool</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mostUsedTools.map((tool, index) => {
                const percentage = summary?.totalToolUsage ? ((tool.count / summary.totalToolUsage) * 100).toFixed(1) : 0;
                return (
                  <tr key={tool._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{index + 1}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{tool._id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tool.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="ml-3 text-sm text-gray-600">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {mostUsedTools.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                    No tool usage data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Stats for Admin */}
      {isAdmin && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h4 className="font-medium text-gray-700 mb-2">Active Users</h4>
            <p className="text-3xl font-bold">{summary.activeUsers || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Users with activity in period</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h4 className="font-medium text-gray-700 mb-2">Avg Actions per User</h4>
            <p className="text-3xl font-bold">{summary.avgActionsPerUser ? summary.avgActionsPerUser.toFixed(1) : 0}</p>
            <p className="text-sm text-gray-500 mt-1">Average actions per active user</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border">
            <h4 className="font-medium text-gray-700 mb-2">Time Range</h4>
            <p className="text-lg font-semibold">
              {summary.timeRange?.start ? new Date(summary.timeRange.start).toLocaleDateString() : 'N/A'} - {summary.timeRange?.end ? new Date(summary.timeRange.end).toLocaleDateString() : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Analysis period</p>
          </div>
        </div>
      )}
    </div>
  );
}