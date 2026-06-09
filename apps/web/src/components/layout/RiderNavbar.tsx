'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function RiderNavbar() {
  const { user, setUser, openLoginModal } = useAuthStore()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'anybuy-rider=; path=/; max-age=0'
    setUser(null)
    router.push('/rider')
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-dark border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/rider" className="flex-shrink-0">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={100} height={30} priority />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === 'rider' ? (
            <>
              <Link
                href="/rider/dashboard"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <LogOut size={14} />Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => openLoginModal('ride')}
              className="bg-brand-orange text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e85a2d] transition-all"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
