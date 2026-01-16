/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel-optimized config
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization for Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;
