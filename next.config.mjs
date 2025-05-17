/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['image.tmdb.org', 'i.ytimg.com'],
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't include API routes in client-side builds
      config.module.rules.push({
        test: /app\/api\/.*/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

export default nextConfig;
