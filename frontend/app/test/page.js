'use client';

import { useState, useEffect } from 'react';
import { getTest } from '@/utils/api';

export default function TestPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchTest();
  }, []);

  const fetchTest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTest();
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to fetch test endpoint');
      console.error('Test API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchTest();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Backend API Test</h1>
          <p className="text-gray-600 mt-2">
            This page tests the connection between the frontend (Vercel) and backend (Railway).
            It calls the <code className="bg-gray-100 px-1 py-0.5 rounded">/api/test</code> endpoint
            and displays the response.
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Backend Base URL:</strong>{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">
                {process.env.NEXT_PUBLIC_API_URL || 'https://sahakarhelp-production.up.railway.app'}
              </code>
            </p>
            <p className="text-sm text-blue-800 mt-1">
              If the connection fails, ensure the backend server is running and the environment variable is set correctly.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading API test data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">API Connection Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    <p className="mt-2">
                      Make sure the backend server is running and accessible at the URL above.
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                    GET
                  </span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">/api/test</code>
                </div>
                <p className="text-gray-600 mb-4">This endpoint tests the basic API connectivity.</p>
              </div>

              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">API Connection Successful!</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Backend is responding correctly.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Response Data:</h3>
                <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto text-sm">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">About This Test</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>This page is a client component that uses <code className="bg-gray-200 px-1 py-0.5 rounded">fetch</code> with <code className="bg-gray-200 px-1 py-0.5 rounded">async/await</code>.</li>
            <li>It calls the <code className="bg-gray-200 px-1 py-0.5 rounded">getTest()</code> function from <code className="bg-gray-200 px-1 py-0.5 rounded">@/utils/api</code>.</li>
            <li>Loading, error, and success states are displayed with appropriate UI.</li>
            <li>You can retry the connection if it fails.</li>
          </ul>
          <div className="mt-4">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}