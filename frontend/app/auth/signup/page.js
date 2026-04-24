"use client";

import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Account Creation Temporarily Disabled
          </h2>
          <p className="mt-4 text-center text-lg text-gray-600">
            User registration is temporarily unavailable.
          </p>
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-center">
              We are performing maintenance on our authentication system.
              Please check back later to create an account.
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Return to Home
            </Link>
          </div>
        </div>
        
        <div className="mt-8 text-sm text-gray-500 text-center">
          <p>For urgent access, please contact support.</p>
          <p className="mt-2">All tools remain available without authentication.</p>
        </div>
      </div>
    </div>
  );
}