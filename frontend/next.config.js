/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      's3.eu-west-1.amazonaws.com',
      'orangeprivacy-uploads.s3.eu-west-1.amazonaws.com',
      'graph.facebook.com',
      'scontent.cdninstagram.com'
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  },
}

module.exports = nextConfig
