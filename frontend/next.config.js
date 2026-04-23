/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Ensure src directory is used
  // No need for custom rewrites/redirects unless required
};

module.exports = nextConfig;