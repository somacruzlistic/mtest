/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['image.tmdb.org', 'i.ytimg.com'],
  },
  experimental: {
    serverActions: true,
  },
  // Ensure API routes are handled as serverless functions
  output: 'standalone',
};

export default nextConfig;
