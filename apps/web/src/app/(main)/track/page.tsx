'use client'

import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@anybuy/utils'
import {
  CheckCircle2, Clock, Loader2, MapPin,
  Package, Search, ShieldCheck, Truck,
} from 'lucide-react'
import { useState } from 'react'

interface TrackResult {
  order: {
    id: string
    tracking_code: string
    status: string
    total_amount: number
    created_at: string
    delivery_street: string | null
    delivery_city: string | null
    delivery_state: string | null
    product: { title: string; thumbnail_url: string | null } | null
    seller_profile: { store_name: string } | null
  }
  delivery: {
    status: string
    pickup_address: string | null
    delivery_address: string | null
    rider: { full_name: string } | null
  } | null
}

const ORDER_STEPS = [
  { key: 'payment_held',  label: 'Order placed',       icon: ShieldCheck, desc: 'Payment secured by AnyBuy' },
  { key: 'preparing',     label: 'Being prepared',      icon: Package,     desc: 'Seller is packing your order' },
  { key: 'picked_up',     label: 'Picked up',           icon: Truck,       desc: 'Rider collected your order' },
  { key: 'in_transit',    label: 'On the way',          icon: Truck,       desc: 'Your order is en route' },
  { key: 'delivered',     label: 'Delivered',           icon: MapPin,      desc: 'Order delivered to your address' },
  { key: 'confirmed',     label: 'Confirmed',           icon: CheckCircle2, desc: 'You confirmed receipt — done!' },
]

const STATUS_ORDER = ['payment_held', 'preparing', 'picked_up', 'in_transit', 'delivered', 'confirmed', 'completed']

function getStepIndex(status: string) {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

const STATUS_COLOR: Record<string, string> = {
  payment_held: 'text-amber-700 bg-amber-50 border-amber-200',
  preparing:    'text-blue-700 bg-blue-50 border-blue-200',
  picked_up:    'text-purple-700 bg-purple-50 border-purple-200',
  in_transit:   'text-indigo-700 bg-indigo-50 border-indigo-200',
  delivered:    'text-teal-700 bg-teal-50 border-teal-200',
  confirmed:    'text-green-700 bg-green-50 border-green-200',
  completed:    'text-green-800 bg-green-100 border-green-300',
  disputed:     'text-red-700 bg-red-50 border-red-200',
  refunded:     'text-neutral-600 bg-neutral-100 border-neutral-200',
}

const STATUS_LABEL: Record<string, string> = {
  payment_held: 'Payment held',
  preparing:    'Preparing',
  picked_up:    'Picked up',
  in_transit:   'In transit',
  delivered:    'Delivered',
  confirmed:    'Confirmed',
  completed:    'Completed',
  disputed:     'Disputed',
  refunded:     'Refunded',
}

export default function TrackOrderPage() {
  const [query, setQuery]       = useState('')
  const [result, setResult]     = useState<TrackResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)
    setSearched(true)

    const supabase = createClient()

    // Search by tracking code or order ID prefix
    const q = query.trim().toUpperCase()
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id, tracking_code, status, total_amount, created_at,
        delivery_street, delivery_city, delivery_state,
        product:products!product_id(title, thumbnail_url),
        seller_profile:seller_profiles!seller_id(store_name)
      `)
      .or(`tracking_code.eq.${q},id.ilike.${q}%`)
      .maybeSingle()

    if (orderErr || !orderData) {
      setError('No order found with that tracking code. Double-check and try again.')
      setLoading(false)
      return
    }

    // Map arrays
    const order = {
      ...orderData,
      product: Array.isArray(orderData.product) ? orderData.product[0] : orderData.product,
      seller_profile: Array.isArray(orderData.seller_profile) ? orderData.seller_profile[0] : orderData.seller_profile,
    }

    // Get delivery
    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select('status, pickup_address, delivery_address, rider:profiles!rider_id(full_name)')
      .eq('order_id', order.id)
      .maybeSingle()

    const delivery = deliveryData ? {
      ...deliveryData,
      rider: Array.isArray(deliveryData.rider) ? deliveryData.rider[0] : deliveryData.rider,
    } : null

    setResult({ order, delivery })
    setLoading(false)
  }

  const stepIdx = result ? getStepIndex(result.order.status) : -1

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-16">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
            <Truck size={26} className="text-brand-orange" />
          </div>
          <h1 className="font-satoshi text-3xl font-bold text-neutral-900">Track your order</h1>
          <p className="text-neutral-500 mt-2">Enter your tracking code or order ID to see live status.</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. AB-12345678 or order ID"
              className="w-full h-12 pl-10 pr-4 border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent text-sm shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-12 px-5 bg-brand-orange text-white font-semibold rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Track'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Order card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-satoshi font-bold text-neutral-900 text-lg">{result.order.product?.title ?? 'Order'}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">From {result.order.seller_profile?.store_name ?? 'Seller'}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${STATUS_COLOR[result.order.status] ?? 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                  {STATUS_LABEL[result.order.status] ?? result.order.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-neutral-500 border-t border-neutral-100 pt-4">
                <div>
                  <p className="text-xs text-neutral-400">Tracking</p>
                  <p className="font-mono font-semibold text-neutral-700">{result.order.tracking_code ?? result.order.id.slice(0,8)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Order value</p>
                  <p className="font-satoshi font-bold text-neutral-900">{formatPrice(result.order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Placed</p>
                  <p className="text-neutral-700">{new Date(result.order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {!['disputed', 'refunded'].includes(result.order.status) && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-card">
                <h3 className="font-satoshi font-bold text-neutral-900 text-sm mb-5">Delivery progress</h3>
                <div className="space-y-0">
                  {ORDER_STEPS.map((step, i) => {
                    const done    = i < stepIdx
                    const current = i === stepIdx
                    const future  = i > stepIdx
                    const isLast  = i === ORDER_STEPS.length - 1

                    return (
                      <div key={step.key} className="flex gap-4">
                        {/* Icon + line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                            ${done ? 'bg-brand-orange text-white' : current ? 'bg-brand-orange text-white ring-4 ring-brand-orange/20' : 'bg-neutral-100 text-neutral-300'}`}>
                            <step.icon size={16} />
                          </div>
                          {!isLast && (
                            <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${done ? 'bg-brand-orange' : 'bg-neutral-200'}`} />
                          )}
                        </div>

                        {/* Text */}
                        <div className={`pb-5 ${isLast ? '' : ''}`}>
                          <p className={`font-semibold text-sm ${future ? 'text-neutral-300' : current ? 'text-neutral-900' : 'text-neutral-600'}`}>
                            {step.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${future ? 'text-neutral-200' : 'text-neutral-400'}`}>{step.desc}</p>
                          {current && (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-brand-orange">
                              <Clock size={9} />Current status
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rider info */}
            {result.delivery && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-card">
                <h3 className="font-satoshi font-bold text-neutral-900 text-sm mb-3">Delivery info</h3>
                <div className="space-y-2 text-sm">
                  {result.delivery.rider && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                        <Truck size={16} className="text-brand-orange" />
                      </div>
                      <div>
                        <p className="text-xs text-neutral-400">Your rider</p>
                        <p className="font-semibold text-neutral-900">{result.delivery.rider.full_name}</p>
                      </div>
                    </div>
                  )}
                  {result.delivery.delivery_address && (
                    <div className="flex items-start gap-2 text-neutral-600 mt-2">
                      <MapPin size={13} className="flex-shrink-0 mt-0.5 text-neutral-400" />
                      <p className="text-xs">{result.delivery.delivery_address}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Escrow note */}
            <div className="bg-brand-dark rounded-2xl px-5 py-4 flex items-start gap-3">
              <ShieldCheck size={18} className="text-brand-orange flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/70">
                <p className="text-white font-semibold mb-0.5">Your payment is protected</p>
                Funds are held by AnyBuy until you confirm delivery. Once received, confirm in the Orders page to release payment to the seller.
              </div>
            </div>
          </div>
        )}

        {/* Empty state (searched but no result) */}
        {searched && !result && !loading && !error && (
          <div className="text-center py-8 text-neutral-400">
            <Search size={24} className="mx-auto mb-2" />
            <p className="text-sm">Enter a tracking code above to see your order.</p>
          </div>
        )}
      </div>
    </div>
  )
}
