import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  reactCompiler: false,
  // Your Next.js config here
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [
      {
        source: '/articles/:path*',
        destination: '/articles/:path*',
      },
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
      {
        source: '/admin/:path*',
        destination: '/admin/:path*',
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: true })
