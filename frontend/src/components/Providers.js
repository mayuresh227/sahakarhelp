"use client";

// Auth temporarily disabled - provide a mock session provider
export default function Providers({ children }) {
  // Simply return children without SessionProvider
  // This prevents errors when NextAuth is disabled
  return <>{children}</>;
}