'use client'

import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@anybuy/utils'
import {
  CheckCircle2, ChevronDown, ChevronRight, Clock,
  Loader2, MapPin, Package, Truck, User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { AdminRole } from '../page'

interface OrderRow {
  id: string
  status: string
  total_amount: number
  created_at: string
  ready_for_pickup: boolean
  delivery_street: string | null
  delivery_city: string | null
  delivery_state: string | null
  tracking_code: string | null
  seller_note: string | null
  product: { title: string; thumbnail_url: string | null } | null
  buyer: { full_name: string; phone: string | null } | null
  seller_id: string | null
  delivery: { id: string; rider_id: string; status: string; rider: { full_name: string } | null } | null
}

interface Rider {
  user_id: string
  full_name: string
  vehicle_type: string
  city: string
  is_available: boolean
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
const STATUS_COLOR: Record<string, string> = {
  payment_held: 'bg-amber-500/15 text-amber-400',
  preparing:    'bg-blue-500/15 text-blue-400',
  picked_up:    'bg-purple-500/15 text-purple-400',
  in_transit:   'bg-indigo-500/15 text-indigo-400',
  delivered:    'bg-teal-500/15 text-teal-400',
  confirmed:    'bg-green-500/15 text-green-400',
  completed:    'bg-green-500/20 text-green-300',
  disputed:     'bg-red-500/15 text-red-400',
  refunded:     'bg-white/[0.06] text-white/40',
}

type Filter = 'needs_rider' | 'in_transit' | 'all'

export function OrderAssignmentTab({ adminRole, onPendingChange }: {
  adminRole: AdminRole
  onPendingChange: (n: number) => void
}) {
  const [orders, setOrders]     = useState<OrderRow[]>([])
  const [riders, setRiders]     = useState<Rider[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<Filter>('needs_rider')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [riderMap, setRiderMap] = useState<Record<string, string>>({})

  const canAssign = ['super_admin', 'order_admin'].includes(adminRole)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const [{ data: orderData }, { data: riderData }] = await Promise.all([
      supabase.from('orders')
        .select(`
          id, status, total_amount, created_at, ready_for_pickup,
          delivery_street, delivery_city, delivery_state, tracking_code, seller_note,
          seller_id,
          product:products!product_id(title, thumbnail_url),
          buyer:profiles!buyer_id(full_name, phone),
          delivery:deliveries!order_id(id, rider_id, status, rider:profiles!rider_id(full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(200),

      supabase.from('rider_profiles')
        .select('user_id, vehicle_type, city, is_available, profile:profiles!user_id(full_name)')
        .eq('status', 'active'),
    ])

    const mappedOrders = (orderData ?? []).map((o: any) => ({
      ...o,
      product: Array.isArray(o.product) ? o.product[0] : o.product,
      buyer: Array.isArray(o.buyer) ? o.buyer[0] : o.buyer,
      delivery: Array.isArray(o.delivery) ? (o.delivery[0] ?? null) : o.delivery,
    }))

    const mappedRiders = (riderData ?? []).map((r: any) => ({
      ...r,
      full_name: Array.isArray(r.profile) ? (r.profile[0]?.full_name ?? '') : (r.profile?.full_name ?? ''),
    }))

    setOrders(mappedOrders)
    setRiders(mappedRiders)

    const pending = mappedOrders.filter((o: OrderRow) => o.ready_for_pickup && !o.delivery).length
    onPendingChange(pending)
    setLoading(false)
  }

  async function assignRider(order: OrderRow) {
    const riderId = riderMap[order.id]
    if (!riderId) { toast.error('Select a rider first'); return }

    setAssigning(order.id)
    const supabase = createClient()
    const { error } = await supabase.from('deliveries').insert({
      order_id: order.id,
      rider_id: riderId,
      status: 'pending_assignment',
      pickup_address: order.seller_note ?? '',
      delivery_address: [order.delivery_street, order.delivery_city, order.delivery_state].filter(Boolean).join(', '),
    })

    if (error) {
      toast.error('Could not assign rider')
    } else {
      await supabase.from('orders').update({ status: 'preparing' }).eq('id', order.id)
      toast.success('Rider assigned!')
      load()
    }
    setAssigning(null)
  }

  const filteredOrders = orders.filter(o => {
    if (filter === 'needs_rider') return o.ready_for_pickup && !o.delivery
    if (filter === 'in_transit')  return ['picked_up', 'in_transit'].includes(o.status)
    return true
  })

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'needs_rider', label: 'Needs rider',  count: orders.filter(o => o.ready_for_pickup && !o.delivery).length },
    { key: 'in_transit',  label: 'In transit',   count: orders.filter(o => ['picked_up','in_transit'].includes(o.status)).length },
    { key: 'all',         label: 'All orders' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-satoshi text-xl font-bold text-white">Order Assignment</h1>
          <p className="text-white/45 text-sm mt-1">Assign riders to orders that are ready for pickup.</p>
        </div>
        <button onClick={load} className="text-sm text-white/35 hover:text-white/70 flex items-center gap-1.5 transition-colors">
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
              ${filter === f.key
                ? 'bg-white/[0.1] text-white'
                : 'text-white/40 border border-white/[0.08] hover:border-white/20 hover:text-white/70'}`}
          >
            {f.label}
            {f.count !== undefined && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                ${filter === f.key ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/40'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Package size={28} className="text-white/15 mx-auto mb-3" />
          <p className="font-semibold text-white/45">
            {filter === 'needs_rider' ? 'No orders waiting for a rider' : 'No orders found'}
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left text-xs font-semibold text-white/30 w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Buyer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Seller</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/30">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Rider</th>
                {canAssign && <th className="px-4 py-3 text-left text-xs font-semibold text-white/30">Assign</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredOrders.map(order => {
                const isExpanded = expanded === order.id
                const hasDelivery = !!order.delivery

                return (
                  <>
                    <tr
                      key={order.id}
                      className={`transition-colors ${order.ready_for_pickup && !hasDelivery ? 'bg-amber-500/[0.04]' : 'hover:bg-white/[0.02]'}`}
                    >
                      {/* Expand toggle */}
                      <td className="pl-4 pr-2 py-3">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : order.id)}
                          className="text-white/20 hover:text-white/60 transition-colors"
                        >
                          {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs text-white/40">{order.tracking_code ?? order.id.slice(0,8)}</p>
                        <p className="text-[11px] text-white/25 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white/80 max-w-[160px] truncate">{order.product?.title ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white/70">{order.buyer?.full_name ?? '—'}</p>
                        {order.buyer?.phone && <p className="text-xs text-white/35">{order.buyer.phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/55 text-sm font-mono text-xs">{order.seller_id?.slice(0, 8) ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-satoshi font-bold text-white">{formatPrice(order.total_amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-block w-fit ${STATUS_COLOR[order.status] ?? 'bg-white/[0.06] text-white/40'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                          {order.ready_for_pickup && !hasDelivery && (
                            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                              <Package size={9} /> Ready — needs rider
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {hasDelivery ? (
                          <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
                            <CheckCircle2 size={13} />
                            {order.delivery?.rider?.full_name ?? 'Assigned'}
                          </div>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                      {canAssign && (
                        <td className="px-4 py-3">
                          {!hasDelivery && order.ready_for_pickup ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={riderMap[order.id] ?? ''}
                                onChange={e => setRiderMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="h-8 px-2 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white
                                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                                  min-w-[120px]"
                              >
                                <option value="" className="bg-[#0d1117]">Select rider…</option>
                                {riders.map(r => (
                                  <option key={r.user_id} value={r.user_id} disabled={!r.is_available} className="bg-[#0d1117]">
                                    {r.full_name} · {r.city} {!r.is_available ? '(busy)' : ''}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => assignRider(order)}
                                disabled={assigning === order.id || !riderMap[order.id]}
                                className="flex items-center gap-1 bg-brand-orange text-white text-xs font-semibold px-3 h-8 rounded-lg hover:bg-[#e85a2d] disabled:opacity-50 transition-all"
                              >
                                {assigning === order.id ? <Loader2 size={11} className="animate-spin" /> : <Truck size={11} />}
                                Assign
                              </button>
                            </div>
                          ) : (
                            <span className="text-white/20 text-xs">—</span>
                          )}
                        </td>
                      )}
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr key={`${order.id}-exp`} className="bg-white/[0.02]">
                        <td colSpan={canAssign ? 9 : 8} className="px-8 py-4">
                          <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs font-semibold text-white/30 mb-1 flex items-center gap-1"><MapPin size={11} />Delivery address</p>
                              <p className="text-white/70">{order.delivery_street || '—'}</p>
                              <p className="text-white/40 text-xs">{[order.delivery_city, order.delivery_state].filter(Boolean).join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white/30 mb-1 flex items-center gap-1"><User size={11} />Seller note</p>
                              <p className="text-white/60">{order.seller_note || 'No note'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white/30 mb-1">Full order ID</p>
                              <p className="font-mono text-xs text-white/30 break-all">{order.id}</p>
                              {order.delivery && (
                                <>
                                  <p className="text-xs font-semibold text-white/30 mt-2 mb-1">Delivery status</p>
                                  <p className="text-white/60 capitalize">{order.delivery.status.replace(/_/g, ' ')}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
