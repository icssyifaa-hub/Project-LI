/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/settings', destination: '/settings-admin', permanent: false },
      { source: '/client', destination: '/settings-staff/client', permanent: false },
      { source: '/holidays', destination: '/settings-staff/holidays', permanent: false },
      { source: '/job-tasks', destination: '/settings-staff/job-tasks', permanent: false },
    ]
  },
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
