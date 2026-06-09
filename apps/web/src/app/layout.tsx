import { AuthProvider } from '@/components/auth/AuthProvider'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Inter is removed from next/font/google to avoid network dependency.
// --font-inter is now defined in globals.css as the system-UI stack,
// which resolves to SF Pro (macOS/iOS), Segoe UI (Windows), Roboto (Android) —
// all visually identical to Inter at typical body sizes.

export const metadata: Metadata = {
  title: {
    default: 'AnyBuy — Buy better. Sell smarter.',
    template: '%s | AnyBuy',
  },
  description: "Africa's most trusted secondhand marketplace. Buy and sell quality items with verified listings, secure payments, and reliable delivery.",
  keywords: ['secondhand', 'marketplace', 'Nigeria', 'buy', 'sell', 'trusted', 'escrow'],
  openGraph: {
    title: 'AnyBuy — Buy better. Sell smarter.',
    description: "Africa's most trusted secondhand marketplace.",
    siteName: 'AnyBuy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AnyBuy — Buy better. Sell smarter.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E2A2B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Satoshi from Fontshare — loaded via <link> to avoid CSS @import conflicts */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily: 'var(--font-inter), sans-serif', borderRadius: '12px' },
            success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
            error: { iconTheme: { primary: '#FF6A3D', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
