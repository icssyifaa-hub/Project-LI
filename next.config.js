/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '192.168.1.55',
    '192.168.1.*',
    '10.105.191.175',
    'localhost',],
  images: {
    domains: [],
  },
}

module.exports = nextConfig;