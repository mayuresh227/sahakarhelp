"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Auth temporarily disabled - always show unauthenticated state
  const session = null;
  const loading = false;

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

          {/* Auth temporarily disabled - show message */}
          <div className="px-3 py-2 bg-yellow-500 text-white rounded text-sm">
            Login temporarily disabled
          </div>
        </div>
      </div>
    </nav>
  );
}