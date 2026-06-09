'use client'

import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES } from '@anybuy/types'
import { formatPrice } from '@anybuy/utils'
import {
  BadgeCheck, Camera, Eye, LayoutDashboard, LogOut, Package,
  Pencil, Plus, Radio, ShoppingBag, ShoppingCart, Tag, Wallet,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { NotificationBell } from '@/components/seller/NotificationBell'
import { StockUpdateModal, type StockListing } from '@/components/seller/StockUpdateModal'
import { DiscountsTab } from './tabs/DiscountsTab'
import { LiveTab } from './tabs/LiveTab'
import type { Order } from './tabs/OrdersTab'
import { OrdersTab } from './tabs/OrdersTab'
import { OverviewTab } from './tabs/OverviewTab'
import { PayoutsTab } from './tabs/PayoutsTab'

// ─────────────────────────────────────────────────────────────────────────────
// Types (exported so tabs can reuse)
// ─────────────────────────────────────────────────────────────────────────────
export interface Listing {
  id: string
  title: string
  price: number
  condition: string
  category: string
  is_available: boolean
  view_count: number
  thumbnail_url: string | null
  created_at: string
  quantity: number
  low_stock_threshold: number
}
interface SellerProfile {
  store_name: string
  store_description: string | null
  store_logo_url: string | null
  total_sales: number
  response_rate: number
  verified_seller: boolean
  seller_tier: number
  kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected'
  listing_limit: number | null
}

type Tab = 'overview' | 'listings' | 'orders' | 'payouts' | 'discounts' | 'live' | 'store'

const CONDITION_LABEL: Record<string, string> = {
  new: 'New', grade_a: 'Grade A', grade_b: 'Grade B', grade_c: 'Grade C',
}
const CONDITION_COLOR: Record<string, string> = {
  new:     'text-green-600 bg-green-50',
  grade_a: 'text-green-600 bg-green-50',
  grade_b: 'text-amber-600 bg-amber-50',
  grade_c: 'text-neutral-500 bg-neutral-100',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SellerDashboardPage() {
  const { user, setUser, loading: authLoading } = useAuthStore()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [profile, setProfile]     = useState<SellerProfile | null>(null)
  const [listings, setListings]   = useState<Listing[]>([])
  const [orders, setOrders]       = useState<Order[]>([])
  const [withdrawn, setWithdrawn] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stockUpdateListing, setStockUpdateListing] = useState<StockListing | null>(null)

  // Store edit
  const [storeName, setStoreName]   = useState('')
  const [storeDesc, setStoreDesc]   = useState('')
  const [savingStore, setSavingStore] = useState(false)
  const [storeLogo, setStoreLogo]   = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    if (authLoading) return           // wait for AuthProvider to resolve the session
    if (!user) { router.replace('/'); return }
    load()
  }, [authLoading, user, router])

  // Handle URL params: ?tab=listings&stockUpdate=<id>
  useEffect(() => {
    if (loading) return
    const tab = searchParams.get('tab') as Tab | null
    if (tab) setActiveTab(tab)
    const stockId = searchParams.get('stockUpdate')
    if (stockId) {
      const listing = listings.find(l => l.id === stockId)
      if (listing) setStockUpdateListing(listing)
    }
  }, [loading, listings, searchParams])

  async function load() {
    const supabase = createClient()

    const [{ data: sp, error: spError }, { data: items }, { data: orderData }, { data: wdData }] =
      await Promise.all([
        supabase.from('seller_profiles')
          .select('store_name,store_description,store_logo_url,total_sales,response_rate,verified_seller,seller_tier,kyc_status,listing_limit')
          .eq('user_id', user!.id).maybeSingle(),

        supabase.from('products')
          .select('id,title,price,condition,category,is_available,view_count,thumbnail_url,created_at,quantity,low_stock_threshold')
          .eq('seller_id', user!.id).order('created_at', { ascending: false }),

        supabase.from('orders')
          .select(`
            id, status, quantity, unit_price, total_amount, created_at,
            delivery_street, delivery_city, delivery_state, tracking_code,
            seller_note, ready_for_pickup,
            product:products!product_id(title, thumbnail_url),
            buyer:profiles!buyer_id(full_name, phone)
          `)
          .eq('seller_id', user!.id).order('created_at', { ascending: false }),

        supabase.from('withdrawals')
          .select('amount').eq('seller_id', user!.id).eq('status', 'completed'),
      ])

    // Only redirect to onboarding if the profile is definitively missing (no network error).
    // A fetch error (spError) means Supabase was unreachable — don't bounce the seller to /sell.
    if (spError) { console.warn('[Dashboard] profile fetch error:', spError.message); setLoading(false); return }
    if (!sp) { setLoading(false); router.replace('/sell'); return }
    setProfile(sp)
    setStoreName(sp.store_name)
    setStoreDesc(sp.store_description ?? '')
    setStoreLogo(sp.store_logo_url ?? null)
    setListings(items ?? [])
    setOrders((orderData ?? []).map((o: any) => ({
      ...o,
      ready_for_pickup: o.ready_for_pickup ?? false,
      seller_note: o.seller_note ?? null,
      product: Array.isArray(o.product) ? o.product[0] : o.product,
      buyer:   Array.isArray(o.buyer)   ? o.buyer[0]   : o.buyer,
    })))
    setWithdrawn((wdData ?? []).reduce((s: number, w: any) => s + (w.amount ?? 0), 0))
    setLoading(false)
  }

  // ── Earnings breakdown ─────────────────────────────────────────────────────
  const earnings = useMemo(() => {
    const NET = 0.95 // after 5% platform fee

    const totalRevenue = orders
      .filter(o => ['confirmed', 'completed'].includes(o.status))
      .reduce((s, o) => s + o.total_amount * NET, 0)

    const inEscrow = orders
      .filter(o => ['payment_held', 'preparing', 'picked_up', 'in_transit'].includes(o.status))
      .reduce((s, o) => s + o.total_amount * NET, 0)

    const completedNet = orders
      .filter(o => ['confirmed', 'completed'].includes(o.status))
      .reduce((s, o) => s + o.total_amount * NET, 0)

    const withdrawable = Math.max(0, completedNet - withdrawn)

    const refunded = orders
      .filter(o => o.status === 'refunded')
      .reduce((s, o) => s + o.total_amount, 0)

    return { totalRevenue, inEscrow, withdrawable, withdrawn, refunded }
  }, [orders, withdrawn])

  async function handleSaveStore() {
    if (!user) return
    setSavingStore(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('seller_profiles')
      .update({ store_name: storeName.trim(), store_description: storeDesc.trim() })
      .eq('user_id', user.id)
    if (error) toast.error('Failed to save')
    else {
      setProfile(p => p ? { ...p, store_name: storeName.trim(), store_description: storeDesc.trim() } : p)
      toast.success('Store updated!')
    }
    setSavingStore(false)
  }

  async function handleLogoUpload(file: File) {
    if (!user) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploadingLogo(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage.from('store-logos').upload(path, file, { upsert: true })
    if (upErr) { toast.error('Upload failed'); setUploadingLogo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('store-logos').getPublicUrl(path)
    // append cache-buster so the browser re-fetches immediately
    const url = `${publicUrl}?t=${Date.now()}`
    await supabase.from('seller_profiles').update({ store_logo_url: url }).eq('user_id', user.id)
    setStoreLogo(url)
    setProfile(p => p ? { ...p, store_logo_url: url } : p)
    toast.success('Store logo updated!')
    setUploadingLogo(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'anybuy-seller=; path=/; max-age=0'
    setUser(null)
    router.replace('/')
  }

  async function toggleAvailability(listing: Listing) {
    const next = !listing.is_available
    const supabase = createClient()
    await supabase.from('products').update({ is_available: next }).eq('id', listing.id)
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, is_available: next } : l))
    toast.success(next ? 'Listing is now live' : 'Listing paused')
  }

  if (loading) {
    return (
      <div className="h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const pendingOrders = orders.filter(o =>
    ['payment_held', 'preparing', 'picked_up', 'in_transit'].includes(o.status)
  )
  const activeListings = listings.filter(l => l.is_available)

  const sellerTier = profile?.seller_tier ?? 1
  const canGoLive  = sellerTier >= 2

  const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard; badge?: number; locked?: boolean }[] = [
    { key: 'overview',  label: 'Overview',      icon: LayoutDashboard },
    { key: 'listings',  label: 'Listings',       icon: Package },
    { key: 'orders',    label: 'Orders',         icon: ShoppingCart, badge: pendingOrders.length || undefined },
    { key: 'payouts',   label: 'Payouts',        icon: Wallet, badge: earnings.withdrawable > 0 ? 1 : undefined },
    { key: 'discounts', label: 'Discounts',      icon: Tag },
    { key: 'live',      label: 'Go Live',        icon: Radio, locked: !canGoLive },
    { key: 'store',     label: 'Store settings', icon: Pencil },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="w-60 bg-brand-dark flex-shrink-0 flex flex-col overflow-y-auto">
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <Link href="/">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={100} height={30} />
          </Link>
        </div>

        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.store_logo_url
                ? <Image src={profile.store_logo_url} alt={profile.store_name} width={36} height={36} className="w-full h-full object-cover" />
                : <span className="text-brand-orange font-bold text-sm">{profile?.store_name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-sm truncate">{profile?.store_name}</p>
                {profile?.verified_seller && <BadgeCheck size={13} className="text-brand-green flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-white/40 text-xs">Seller</p>
                {sellerTier >= 1 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none
                    ${sellerTier === 4 ? 'bg-brand-orange/20 text-brand-orange'
                    : sellerTier === 3 ? 'bg-blue-500/20 text-blue-400'
                    : sellerTier === 2 ? 'bg-green-500/20 text-green-400'
                    : 'bg-white/10 text-white/50'}`}>
                    {sellerTier === 4 ? 'Power Seller'
                     : sellerTier === 3 ? 'Trusted'
                     : sellerTier === 2 ? 'Verified'
                     : 'New Seller'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Earnings quick-stat */}
        <div className="px-5 py-4 border-b border-white/10">
          <p className="text-white/40 text-[11px] uppercase tracking-widest mb-1">Withdrawable</p>
          <p className="font-satoshi text-xl font-bold text-white">{formatPrice(earnings.withdrawable)}</p>
          {earnings.withdrawable > 0 && (
            <button
              onClick={() => setActiveTab('payouts')}
              className="text-brand-orange text-xs font-semibold mt-1 hover:underline"
            >
              Withdraw →
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ key, label, icon: Icon, badge, locked }) => (
            <button
              key={key}
              onClick={() => !locked && setActiveTab(key)}
              disabled={locked}
              title={locked ? 'Verify your identity to unlock live selling' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
                ${locked
                  ? 'text-white/25 cursor-not-allowed'
                  : key === 'live'
                    ? activeTab === 'live'
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                    : activeTab === key
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {key === 'live' && !locked && activeTab !== 'live' && (
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              )}
              {locked && (
                <span className="text-[10px] text-white/25">Locked</span>
              )}
              {!locked && badge !== undefined && badge > 0 && (
                <span className="bg-brand-orange text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5 space-y-1 border-t border-white/10 pt-4">
          <Link href="/seller/new-listing"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-orange hover:bg-[#e85a2d] transition-colors">
            <Plus size={16} />New listing
          </Link>
          <Link href="/?buyer=1" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <ShoppingBag size={16} />View marketplace
          </Link>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/5 transition-all text-left">
            <LogOut size={16} />Sign out
          </button>
        </div>
      </aside>

      {/* Stock update modal (page-level) */}
      <StockUpdateModal
        open={!!stockUpdateListing}
        listing={stockUpdateListing}
        onClose={() => setStockUpdateListing(null)}
        onUpdated={(id, newQty, isAvailable) => {
          setListings(prev => prev.map(l =>
            l.id === id ? { ...l, quantity: newQty, is_available: isAvailable } : l
          ))
          setStockUpdateListing(null)
        }}
      />

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-b border-neutral-100 bg-neutral-50">
          <NotificationBell userId={user!.id} />
        </div>

        <div className={`flex-1 overflow-y-auto`}>
        <div className={`px-6 py-8 w-full mx-auto ${activeTab === 'orders' ? 'h-full flex flex-col' : 'max-w-5xl'}`}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <OverviewTab
              user={user}
              profile={profile}
              listings={listings}
              orders={orders}
              earnings={earnings}
              withdrawn={withdrawn}
              sellerTier={sellerTier}
              kycStatus={profile?.kyc_status ?? 'pending'}
              listingLimit={profile?.listing_limit ?? 5}
              onGoToOrders={() => setActiveTab('orders')}
              onGoToPayouts={() => setActiveTab('payouts')}
            />
          )}

          {/* LISTINGS */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-satoshi text-xl font-bold text-neutral-900">Your listings</h1>
                  <p className="text-neutral-500 text-sm mt-0.5">
                    {activeListings.length} active · {listings.length - activeListings.length} paused
                  </p>
                </div>
                <Link href="/seller/new-listing"
                  className="flex items-center gap-1.5 bg-brand-orange text-white font-semibold px-4 py-2 rounded-xl hover:bg-[#e85a2d] transition-colors text-sm">
                  <Plus size={15} />New listing
                </Link>
              </div>
              {listings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-card p-12 text-center">
                  <Package size={32} className="text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">No listings yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-card overflow-hidden divide-y divide-neutral-100">
                  {listings.map(l => (
                    <ListingRow
                      key={l.id}
                      listing={l}
                      onToggle={toggleAvailability}
                      onUpdateStock={setStockUpdateListing}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              sellerId={user!.id}
              onOrdersChange={setOrders}
            />
          )}

          {/* PAYOUTS */}
          {activeTab === 'payouts' && (
            <PayoutsTab
              sellerId={user!.id}
              withdrawable={earnings.withdrawable}
            />
          )}

          {/* DISCOUNTS */}
          {activeTab === 'discounts' && (
            <DiscountsTab
              sellerId={user!.id}
              listings={listings.map(l => ({ id: l.id, title: l.title, price: l.price }))}
            />
          )}

          {/* GO LIVE */}
          {activeTab === 'live' && (
            <LiveTab sellerId={user!.id} />
          )}

          {/* STORE SETTINGS */}
          {activeTab === 'store' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-satoshi text-xl font-bold text-neutral-900">Store settings</h1>
                <p className="text-neutral-500 text-sm mt-1">Update your store info visible to buyers.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-card p-6 space-y-5">

                {/* Logo upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-900">Store logo</label>
                  <div className="flex items-center gap-4">
                    <label className="relative group cursor-pointer flex-shrink-0">
                      <div className="w-20 h-20 rounded-2xl bg-brand-orange/10 overflow-hidden flex items-center justify-center ring-2 ring-brand-orange/20 group-hover:ring-brand-orange/50 transition-all">
                        {storeLogo
                          ? <Image src={storeLogo} alt="Store logo" width={80} height={80} className="w-full h-full object-cover" />
                          : <span className="text-brand-orange font-bold text-2xl">{storeName?.[0]?.toUpperCase()}</span>
                        }
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                          {uploadingLogo
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Camera size={18} className="text-white" />
                          }
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingLogo}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
                      />
                    </label>
                    <div>
                      <p className="text-sm text-neutral-700 font-medium">Upload a logo</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Square image, at least 200×200 px. Max 5 MB.</p>
                      <p className="text-xs text-neutral-400">Shown on your listings and store page.</p>
                    </div>
                  </div>
                </div>

                <Input label="Store name" value={storeName} onChange={e => setStoreName(e.target.value)}
                  hint="This is what buyers see on all your listings." />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-900">Store description</label>
                  <textarea
                    value={storeDesc}
                    onChange={e => setStoreDesc(e.target.value)}
                    placeholder="Tell buyers what you sell and why they should trust you…"
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none text-sm transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-neutral-900">Category focus</label>
                  <p className="text-xs text-neutral-500">Auto-detected from your active listings.</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CATEGORIES.map(cat => {
                      const active = listings.some(l => l.category === cat.slug)
                      return (
                        <span key={cat.slug}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                            ${active ? 'bg-brand-orange/10 text-brand-orange border-brand-orange/30' : 'bg-neutral-50 text-neutral-400 border-neutral-200'}`}>
                          {cat.name}{active && ' ✓'}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <Button onClick={handleSaveStore} loading={savingStore}>Save store settings</Button>
              </div>

              <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
                <h3 className="font-satoshi font-bold text-neutral-900">Account</h3>
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold">
                    {user?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 text-sm">{user?.full_name}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-4">
                  <Button variant="danger" onClick={handleSignOut} className="gap-2" size="sm">
                    <LogOut size={14} />Sign out
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function ListingRow({
  listing,
  onToggle,
  onUpdateStock,
}: {
  listing: Listing
  onToggle: (l: Listing) => void
  onUpdateStock: (l: Listing) => void
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors">
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
        {listing.thumbnail_url
          ? <Image src={listing.thumbnail_url} alt={listing.title} width={48} height={48} className="object-cover w-full h-full" />
          : <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-neutral-300" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/products/${listing.id}`}
          className="font-medium text-neutral-900 text-sm truncate hover:text-brand-orange transition-colors block">
          {listing.title}
        </Link>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONDITION_COLOR[listing.condition] ?? 'text-neutral-500 bg-neutral-100'}`}>
            {CONDITION_LABEL[listing.condition] ?? listing.condition}
          </span>
          <span className="text-xs text-neutral-400 capitalize">{listing.category}</span>
          {/* Stock chip */}
          {listing.quantity === 0
            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">Out of stock</span>
            : listing.quantity <= listing.low_stock_threshold
              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Low: {listing.quantity} left</span>
              : <span className="text-xs text-neutral-400">{listing.quantity} in stock</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="font-satoshi font-bold text-neutral-900 text-sm">{formatPrice(listing.price)}</p>
          <div className="flex items-center gap-1 justify-end text-neutral-400 mt-0.5">
            <Eye size={10} /><span className="text-xs">{listing.view_count ?? 0}</span>
          </div>
        </div>
        <button
          onClick={() => onUpdateStock(listing)}
          className="text-xs text-neutral-400 hover:text-brand-orange transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
          title="Update stock"
        >
          <Package size={13} />
        </button>
        <button
          onClick={() => onToggle(listing)}
          className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${listing.is_available ? 'bg-brand-green' : 'bg-neutral-300'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${listing.is_available ? 'left-4' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )
}
