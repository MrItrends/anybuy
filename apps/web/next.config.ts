import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@anybuy/config', '@anybuy/types', '@anybuy/utils'],

  // Compress responses with gzip
  compress: true,

  images: {
    // Serve AVIF first (smallest), fall back to WebP, then original
    formats: ['image/avif', 'image/webp'],

    // Cache optimised images for 1 year on CDN
    minimumCacheTTL: 31536000,

    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  experimental: {
    // Tree-shake lucide-react — only imports used icons
    optimizePackageImports: ['lucide-react'],
  },
}

export default nextConfig
