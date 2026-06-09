'use client'

import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import {
  Heart, HelpCircle, LayoutDashboard, LogOut, Mic, MicOff, Package,
  Search, ShoppingCart, Store, Truck, Tv2, User, Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'
import { createClient } from '@/lib/supabase/client'
import { useVoiceSearch } from '@/hooks/useVoiceSearch'

export function Navbar() {
  const { user, setUser, openLoginModal } = useAuthStore()
  const cartCount = useCartStore(s => s.itemCount())
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const { status: voiceStatus, supported: voiceSupported, start: startVoice } = useVoiceSearch({
    onResult: (text) => router.push(`/search?q=${encodeURIComponent(text)}`),
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'anybuy-seller=; path=/; max-age=0'
    setUser(null)
    router.push('/')
  }

  const isSeller = user?.role === 'seller'
  const isRider  = user?.role === 'rider'
  const isBuyer  = !!user && !isSeller && !isRider

  return (
    <header className="sticky top-0 z-40 bg-brand-dark border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link href={isSeller ? '/seller/dashboard' : '/'} className="flex-shrink-0 flex items-center">
          <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={120} height={36} priority />
        </Link>

        {/* Search — hidden for sellers on their dashboard context */}
        <div className="flex-1 relative">
          <Link
            href="/search"
            className="flex items-center gap-2 h-10 px-4 pr-11 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-xl transition-all text-sm w-full"
          >
            <Search size={16} className="flex-shrink-0" />
            {voiceStatus === 'listening' ? (
              <span className="text-brand-orange animate-pulse">Listening…</span>
            ) : (
              <span>Search for anything…</span>
            )}
          </Link>
          {voiceSupported && (
            <button
              onClick={e => { e.preventDefault(); startVoice() }}
              title={voiceStatus === 'listening' ? 'Listening…' : 'Search by voice'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                ${voiceStatus === 'listening'
                  ? 'bg-brand-orange text-white animate-pulse'
                  : voiceStatus === 'error'
                    ? 'bg-red-500 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/10'}`}
            >
              {voiceStatus === 'error' ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
        </div>

        {/* Actions */}
        <nav className="flex items-center gap-2">

          {/* Live — always visible */}
          <Link
            href="/live"
            className="hidden sm:flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
          >
            <Tv2 size={16} className="text-brand-orange" />
            Live
          </Link>

          {/* Sell button — only shown when logged out */}
          {!user && (
            <>
              <Button variant="primary" size="sm" onClick={() => openLoginModal('sell')} className="hidden sm:flex gap-1.5">
                <Store size={14} />
                Sell
              </Button>
              <button
                onClick={() => openLoginModal('sell')}
                className="sm:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                title="Start selling"
              >
                <Store size={20} />
              </button>
            </>
          )}

          {/* Seller: Dashboard button */}
          {isSeller && (
            <>
              <Link
                href="/seller/dashboard"
                className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-all"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
              <Link
                href="/seller/dashboard"
                className="sm:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                title="Seller Dashboard"
              >
                <LayoutDashboard size={20} />
              </Link>
            </>
          )}

          {/* Rider: Dashboard button */}
          {isRider && (
            <>
              <Link
                href="/rider/dashboard"
                className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-all"
              >
                <Truck size={14} />
                My Rides
              </Link>
              <Link
                href="/rider/dashboard"
                className="sm:hidden p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                title="Rider Dashboard"
              >
                <Truck size={20} />
              </Link>
            </>
          )}

          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
          >
            <ShoppingCart size={20} />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          {/* Avatar dropdown / Sign In */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl hover:bg-white/10 p-1.5 transition-all"
              >
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.full_name} width={30} height={30} className="rounded-full" />
                ) : (
                  <div className="w-[30px] h-[30px] rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-bold">
                    {user.full_name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-100 py-2 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    {isSeller && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full">Seller account</span>
                    )}
                    {isRider && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full">Rider account</span>
                    )}
                  </div>

                  <div className="py-1">
                    {/* Seller-specific */}
                    {isSeller && (
                      <Link href="/seller/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-brand-orange hover:bg-orange-50 transition-colors">
                        <LayoutDashboard size={15} />Seller Dashboard
                      </Link>
                    )}

                    {/* Rider-specific */}
                    {isRider && (
                      <Link href="/rider/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-brand-orange hover:bg-orange-50 transition-colors">
                        <Truck size={15} />Rider Dashboard
                      </Link>
                    )}

                    {/* Buyer-specific */}
                    {isBuyer && (
                      <>
                        <Link href="/orders" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                          <Package size={15} className="text-neutral-400" />My Orders
                        </Link>
                        <Link href="/wishlist" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                          <Heart size={15} className="text-neutral-400" />Saved Items
                        </Link>
                        <Link href="/following" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                          <Users size={15} className="text-neutral-400" />Following
                        </Link>
                        <Link href="/track" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                          <Package size={15} className="text-neutral-400" />Track an Order
                        </Link>
                      </>
                    )}

                    <Link href="/help" onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                      <HelpCircle size={15} className="text-neutral-400" />Help & Support
                    </Link>
                  </div>

                  {/* Buyer: soft "Start selling" prompt */}
                  {isBuyer && (
                    <div className="border-t border-neutral-100 pt-1">
                      <Link href="/seller" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors">
                        <Store size={15} className="text-neutral-400" />Start selling on AnyBuy
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-neutral-100 pt-1">
                    <button
                      onClick={() => { setDropdownOpen(false); handleSignOut() }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                    >
                      <LogOut size={15} />Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => openLoginModal()}>
              <User size={14} />Sign In
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
