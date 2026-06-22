/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '192.168.1.55',
    '192.168.1.*',
    '10.105.191.175',
    '192.168.1.62',
    '10.202.137.122',
    'localhost',],
  images: {
    domains: [],
  },
}

module.exports = nextConfig;