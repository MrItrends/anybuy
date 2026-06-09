'use client'

import { LoginModal } from '@/components/auth/LoginModal'
import { Footer } from '@/components/layout/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { usePathname } from 'next/navigation'

/**
 * Conditionally wraps children with the buyer marketplace shell
 * (Navbar + Footer + LoginModal) or just LoginModal for seller routes.
 *
 * Seller dashboard lives at /seller/* and provides its own full-screen layout
 * with a left sidebar, so the marketplace navbar must be hidden there.
 */
export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSellerApp = pathname.startsWith('/seller/')
  const isAdminApp  = pathname.startsWith('/admin/')
  const isRiderApp  = pathname.startsWith('/rider')   // covers /rider and /rider/*
  // Live room is a full-screen experience — no navbar/footer
  const isLiveRoom  = /^\/live\/[^/]+/.test(pathname)

  if (isSellerApp || isAdminApp || isRiderApp || isLiveRoom) {
    return (
      <>
        <LoginModal />
        {children}
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <LoginModal />
    </>
  )
}
