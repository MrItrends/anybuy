'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@anybuy/utils'
import {
  CheckCircle2, ChevronDown, ChevronRight, Clock,
  Loader2, LogOut, MapPin, Package,
  Phone, Truck, XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Delivery {
  id: string
  order_id: string
  status: string
  pickup_address: string | null
  delivery_address: string | null
  assigned_at: string | null
  created_at: string
  order: {
    id: string
    tracking_code: string | null
    total_amount: number
    delivery_street: string | null
    delivery_city: string | null
    delivery_state: string | null
    status: string
    product: { title: string; thumbnail_url: string | null } | null
    buyer: { full_name: string; phone: string | null } | null
    seller_profile: { store_name: string } | null
  } | null
}

interface RiderProfile {
  vehicle_type: string
  vehicle_plate: string | null
  city: string
  state: string
  is_available: boolean
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended'
  rejection_reason: string | null
}

const DELIVERY_STATUSES = [
  { key: 'pending_assignment', label: 'Pending',           next: 'accepted',           nextLabel: 'Accept delivery',     color: 'bg-amber-50 text-amber-700' },
  { key: 'accepted',           label: 'Accepted',          next: 'picked_up',           nextLabel: 'Mark as picked up',   color: 'bg-blue-50 text-blue-700' },
  { key: 'picked_up',          label: 'Picked up',         next: 'in_transit',          nextLabel: 'Start transit',       color: 'bg-purple-50 text-purple-700' },
  { key: 'in_transit',         label: 'In transit',        next: 'at_delivery_point',   nextLabel: 'Arrived at door',     color: 'bg-indigo-50 text-indigo-700' },
  { key: 'at_delivery_point',  label: 'At delivery point', next: 'delivered',           nextLabel: 'Mark as delivered',   color: 'bg-teal-50 text-teal-700' },
  { key: 'delivered',          label: 'Delivered',         next: null,                  nextLabel: null,                  color: 'bg-green-50 text-green-700' },
  { key: 'failed',             label: 'Failed',            next: null,                  nextLabel: null,                  color: 'bg-red-50 text-red-700' },
  { key: 'returned',           label: 'Returned',          next: null,                  nextLabel: null,                  color: 'bg-neutral-100 text-neutral-500' },
]

type Filter = 'active' | 'completed' | 'all'

export default function RiderDashboardPage() {
  const { user, setUser } = useAuthStore()
  const router = useRouter()

  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(null)
  const [deliveries, setDeliveries]     = useState<Delivery[]>([])
  const [loading, setLoading]           = useState(true)
  const [checking, setChecking]         = useState(true)
  const [filter, setFilter]             = useState<Filter>('active')
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [updating, setUpdating]         = useState<string | null>(null)
  const [toggling, setToggling]         = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/rider'); return }
    // Ensure rider cookie is always set when on the dashboard
    document.cookie = 'anybuy-rider=1; path=/; max-age=2592000; SameSite=Lax'
    checkAccess()
  }, [user])

  async function checkAccess() {
    const supabase = createClient()
    const { data } = await supabase
      .from('rider_profiles')
      .select('vehicle_type, vehicle_plate, city, state, is_available, status, rejection_reason')
      .eq('user_id', user!.id)
      .maybeSingle()

    if (!data) {
      // No profile yet — send to onboarding
      router.replace('/rider/onboarding')
      return
    }
    if (data.status === 'suspended') {
      router.replace('/rider')
      return
    }
    // pending / rejected / approved / active — all land on dashboard (different UI)
    setRiderProfile(data)
    setChecking(false)
    if (data.status === 'approved' || data.status === 'active') {
      loadDeliveries()
    } else {
      setLoading(false)
    }
  }

  async function loadDeliveries() {
    const supabase = createClient()
    const { data } = await supabase
      .from('deliveries')
      .select(`
        id, order_id, status, pickup_address, delivery_address, assigned_at, created_at,
        order:orders!order_id(
          id, tracking_code, total_amount, delivery_street, delivery_city, delivery_state, status,
          product:products!product_id(title, thumbnail_url),
          buyer:profiles!buyer_id(full_name, phone),
          seller_profile:seller_profiles!seller_id(store_name)
        )
      `)
      .eq('rider_id', user!.id)
      .order('created_at', { ascending: false })

    setDeliveries((data ?? []).map((d: any) => ({
      ...d,
      order: Array.isArray(d.order) ? {
        ...d.order[0],
        product: Array.isArray(d.order[0]?.product) ? d.order[0].product[0] : d.order[0]?.product,
        buyer: Array.isArray(d.order[0]?.buyer) ? d.order[0].buyer[0] : d.order[0]?.buyer,
        seller_profile: Array.isArray(d.order[0]?.seller_profile) ? d.order[0].seller_profile[0] : d.order[0]?.seller_profile,
      } : d.order,
    })))
    setLoading(false)
  }

  async function advanceStatus(delivery: Delivery) {
    const current = DELIVERY_STATUSES.find(s => s.key === delivery.status)
    if (!current?.next) return

    setUpdating(delivery.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('deliveries')
      .update({ status: current.next })
      .eq('id', delivery.id)

    if (!error) {
      // Also update the order status to mirror
      const orderStatusMap: Record<string, string> = {
        picked_up:         'picked_up',
        in_transit:        'in_transit',
        at_delivery_point: 'in_transit',
        delivered:         'delivered',
      }
      if (orderStatusMap[current.next]) {
        await supabase.from('orders').update({ status: orderStatusMap[current.next] }).eq('id', delivery.order_id)
      }
      setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, status: current.next! } : d))
      toast.success(`Updated: ${current.nextLabel}`)
    } else {
      toast.error('Could not update status')
    }
    setUpdating(null)
  }

  async function markFailed(delivery: Delivery) {
    if (!window.confirm('Mark this delivery as failed?')) return
    setUpdating(delivery.id)
    const supabase = createClient()
    await supabase.from('deliveries').update({ status: 'failed' }).eq('id', delivery.id)
    setDeliveries(prev => prev.map(d => d.id === delivery.id ? { ...d, status: 'failed' } : d))
    toast.error('Delivery marked as failed')
    setUpdating(null)
  }

  async function toggleAvailability() {
    if (!riderProfile) return
    setToggling(true)
    const supabase = createClient()
    const next = !riderProfile.is_available
    await supabase.from('rider_profiles').update({ is_available: next }).eq('user_id', user!.id)
    setRiderProfile(p => p ? { ...p, is_available: next } : p)
    toast.success(next ? 'You are now available for deliveries' : 'You are now unavailable')
    setToggling(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'anybuy-rider=; path=/; max-age=0'
    setUser(null)
    router.replace('/rider')
  }

  if (checking) {
    return (
      <div className="h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Pending approval screen ──────────────────────────────────────────────────
  if (riderProfile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <div className="bg-brand-dark px-6 py-4 flex items-center justify-between">
          <Link href="/rider">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={90} height={28} />
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
            <LogOut size={14} />Sign out
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
              <Clock size={32} className="text-amber-500" />
            </div>
            <h1 className="font-satoshi text-2xl font-bold text-neutral-900 mb-3">Application under review</h1>
            <p className="text-neutral-600 mb-6">
              Thanks for signing up! Our team is reviewing your documents and compliance details.
              This usually takes 24–48 hours.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-left space-y-2 mb-8">
              <p className="text-sm font-semibold text-amber-800">What happens next?</p>
              <ul className="text-sm text-amber-700 space-y-1.5">
                <li>· We'll verify your identity documents and vehicle information</li>
                <li>· You'll receive an email when your application is approved</li>
                <li>· Once approved, you can start accepting deliveries immediately</li>
              </ul>
            </div>
            <p className="text-sm text-neutral-400">Have questions? Contact us at <a href="mailto:riders@anybuy.ng" className="text-brand-orange hover:underline">riders@anybuy.ng</a></p>
          </div>
        </div>
      </div>
    )
  }

  // ── Rejected screen ──────────────────────────────────────────────────────────
  if (riderProfile?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <div className="bg-brand-dark px-6 py-4 flex items-center justify-between">
          <Link href="/rider">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={90} height={28} />
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
            <LogOut size={14} />Sign out
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="font-satoshi text-2xl font-bold text-neutral-900 mb-3">Application not approved</h1>
            <p className="text-neutral-600 mb-4">
              Unfortunately, we weren't able to approve your rider application at this time.
            </p>
            {riderProfile.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-left mb-6">
                <p className="text-sm font-semibold text-red-800 mb-1">Reason</p>
                <p className="text-sm text-red-700">{riderProfile.rejection_reason}</p>
              </div>
            )}
            <p className="text-sm text-neutral-500 mb-6">
              If you believe this is an error or have updated documentation, contact us to appeal.
            </p>
            <a
              href="mailto:riders@anybuy.ng"
              className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#e85a2d] transition-all"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    )
  }

  const ACTIVE_STATUSES = ['pending_assignment', 'accepted', 'picked_up', 'in_transit', 'at_delivery_point']
  const filteredDeliveries = deliveries.filter(d => {
    if (filter === 'active')    return ACTIVE_STATUSES.includes(d.status)
    if (filter === 'completed') return ['delivered', 'failed', 'returned'].includes(d.status)
    return true
  })

  const activeCount    = deliveries.filter(d => ACTIVE_STATUSES.includes(d.status)).length
  const completedCount = deliveries.filter(d => d.status === 'delivered').length

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: 'active',    label: 'Active',    count: activeCount },
    { key: 'completed', label: 'Completed', count: completedCount },
    { key: 'all',       label: 'All',       count: deliveries.length },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-56 bg-brand-dark flex-shrink-0 flex flex-col overflow-y-auto">
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          <Link href="/">
            <Image src="/Header_Light_Mode.svg" alt="AnyBuy" width={90} height={28} />
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
            <Truck size={10} />RIDER
          </div>
        </div>

        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-300 font-bold text-sm">{user?.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.full_name}</p>
              <p className="text-white/40 text-xs capitalize">{riderProfile?.vehicle_type}</p>
            </div>
          </div>
        </div>

        {/* Availability toggle */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs mb-0.5">Availability</p>
              <p className={`text-sm font-semibold ${riderProfile?.is_available ? 'text-brand-green' : 'text-neutral-400'}`}>
                {riderProfile?.is_available ? 'Available' : 'Unavailable'}
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${riderProfile?.is_available ? 'bg-brand-green' : 'bg-neutral-600'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${riderProfile?.is_available ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 border-b border-white/10 space-y-3">
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-widest">Active deliveries</p>
            <p className="font-satoshi text-2xl font-bold text-white">{activeCount}</p>
          </div>
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-widest">Total completed</p>
            <p className="font-satoshi text-lg font-bold text-white/70">{completedCount}</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="px-3 pb-5 border-t border-white/10 pt-4">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white/80 hover:bg-white/5 transition-all text-left">
            <LogOut size={16} />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-satoshi text-xl font-bold text-neutral-900">My Deliveries</h1>
              <p className="text-neutral-500 text-sm mt-1">
                {riderProfile?.city}, {riderProfile?.state} · {riderProfile?.vehicle_plate ?? 'No plate'}
              </p>
            </div>
            <button onClick={loadDeliveries} className="text-sm text-neutral-400 hover:text-neutral-700 flex items-center gap-1.5">
              <Clock size={13} />Refresh
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${filter === f.key ? 'bg-brand-dark text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400'}`}
              >
                {f.label}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Delivery cards */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={24} className="animate-spin text-neutral-300" />
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
              <Truck size={28} className="text-neutral-200 mx-auto mb-3" />
              <p className="font-semibold text-neutral-600">
                {filter === 'active' ? 'No active deliveries' : 'No deliveries found'}
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                {filter === 'active' ? "You'll be notified when a new delivery is assigned." : 'Your delivery history will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliveries.map(delivery => {
                const statusInfo = DELIVERY_STATUSES.find(s => s.key === delivery.status)
                const isExpanded = expanded === delivery.id
                const isActive = ACTIVE_STATUSES.includes(delivery.status)

                return (
                  <div key={delivery.id} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                    {/* Card header */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <Package size={18} className="text-neutral-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-neutral-900 text-sm truncate">
                            {delivery.order?.product?.title ?? 'Product'}
                          </p>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusInfo?.color ?? 'bg-neutral-100 text-neutral-500'}`}>
                            {statusInfo?.label ?? delivery.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          {delivery.delivery_address ?? [delivery.order?.delivery_city, delivery.order?.delivery_state].filter(Boolean).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-satoshi font-bold text-neutral-900 text-sm">
                            {formatPrice(delivery.order?.total_amount ?? 0)}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono">
                            {delivery.order?.tracking_code ?? '—'}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : delivery.id)}
                          className="text-neutral-300 hover:text-neutral-600"
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-5 py-4 space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          {/* Buyer info */}
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Buyer</p>
                            <p className="font-medium text-neutral-800">{delivery.order?.buyer?.full_name ?? '—'}</p>
                            {delivery.order?.buyer?.phone && (
                              <a href={`tel:${delivery.order.buyer.phone}`}
                                className="flex items-center gap-1 text-brand-orange hover:underline text-xs">
                                <Phone size={11} />{delivery.order.buyer.phone}
                              </a>
                            )}
                          </div>

                          {/* Addresses */}
                          <div className="space-y-2">
                            {delivery.pickup_address && (
                              <div>
                                <p className="text-xs font-semibold text-neutral-500">Pickup from</p>
                                <p className="text-neutral-700 text-xs">{delivery.pickup_address}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-neutral-500">Deliver to</p>
                              <p className="text-neutral-700 text-xs">
                                {[delivery.order?.delivery_street, delivery.order?.delivery_city, delivery.order?.delivery_state].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        {isActive && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-neutral-500">Progress</p>
                            <div className="flex items-center gap-0">
                              {DELIVERY_STATUSES.slice(0, 6).map((s, i) => {
                                const statusIdx = DELIVERY_STATUSES.findIndex(x => x.key === delivery.status)
                                const done = i <= statusIdx
                                const isLast = i === 5
                                return (
                                  <div key={s.key} className="flex items-center flex-1">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${done ? 'bg-brand-orange' : 'bg-neutral-200'}`} />
                                    {!isLast && <div className={`flex-1 h-0.5 ${done ? 'bg-brand-orange' : 'bg-neutral-200'}`} />}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex justify-between">
                              {['Assigned', 'Accepted', 'Picked up', 'In transit', 'At door', 'Delivered'].map((l, i) => (
                                <p key={i} className={`text-[9px] ${i <= DELIVERY_STATUSES.findIndex(x => x.key === delivery.status) ? 'text-brand-orange font-semibold' : 'text-neutral-300'}`}>
                                  {i === 0 || i === 5 ? l : ''}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {isActive && statusInfo?.next && (
                          <div className="flex gap-3 pt-1">
                            <button
                              onClick={() => advanceStatus(delivery)}
                              disabled={updating === delivery.id}
                              className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all"
                            >
                              {updating === delivery.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <CheckCircle2 size={14} />}
                              {statusInfo.nextLabel}
                            </button>
                            {!['failed', 'delivered', 'returned'].includes(delivery.status) && (
                              <button
                                onClick={() => markFailed(delivery)}
                                disabled={updating === delivery.id}
                                className="flex items-center gap-2 text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
                              >
                                <XCircle size={14} />Report failed
                              </button>
                            )}
                          </div>
                        )}

                        {delivery.status === 'delivered' && (
                          <div className="flex items-center gap-2 text-green-600 font-semibold text-sm bg-green-50 px-4 py-3 rounded-xl">
                            <CheckCircle2 size={16} />Delivery completed successfully
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
