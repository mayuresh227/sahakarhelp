"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const loading = status === "loading";

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold">SahakarHelp</h1>
            <p className="text-sm">Cooperative Society Tools Platform</p>
          </div>
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        <div
          className={`${
            isMenuOpen ? "flex" : "hidden"
          } md:flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mt-4 md:mt-0 w-full md:w-auto`}
        >
          <Link
            href="/"
            className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/test"
            className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            API Test
          </Link>
          <Link
            href="/pricing"
            className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/tools/calculator"
            className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Calculator
          </Link>

          {loading ? (
            <div className="px-3 py-2">Loading...</div>
          ) : session ? (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="hidden md:flex flex-col">
                  <span className="font-medium">
                    {session.user.name || session.user.email}
                  </span>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${session.user.plan === 'pro' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.user.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                    {session.user.plan !== 'pro' && (
                      <Link
                        href="/pricing"
                        className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Upgrade
                      </Link>
                    )}
                    <span className={`px-2 py-0.5 rounded-full ${session.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <Link
                  href="/dashboard"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {session.user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="hover:bg-blue-700 px-3 py-2 rounded transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
              {/* Mobile dropdown */}
              <div className="md:hidden relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg py-2 z-10">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    {session.user.role === 'admin' && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Link
                href="/auth/signin"
                className="bg-white text-blue-600 hover:bg-gray-100 px-3 py-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-transparent border border-white hover:bg-blue-700 px-3 py-2 rounded transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}