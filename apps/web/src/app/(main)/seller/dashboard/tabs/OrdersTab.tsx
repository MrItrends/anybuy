'use client'

import React from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@anybuy/utils'
import {
  CheckSquare, ChevronDown, ChevronUp, Clock, Download,
  Loader2, MapPin, Package, Search, Square, Truck,
} from 'lucide-react'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

export interface Order {
  id: string
  status: string
  quantity: number
  unit_price: number
  total_amount: number
  created_at: string
  delivery_street: string | null
  delivery_city: string | null
  delivery_state: string | null
  tracking_code: string | null
  seller_note: string | null
  ready_for_pickup: boolean
  product: { title: string; thumbnail_url: string | null } | null
  buyer: { full_name: string; phone: string | null } | null
}

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  payment_held:   'New order',
  preparing:      'Preparing',
  picked_up:      'Picked up',
  in_transit:     'In transit',
  delivered:      'Delivered',
  confirmed:      'Confirmed',
  completed:      'Completed',
  disputed:       'Disputed',
  refunded:       'Refunded',
}
const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'text-neutral-500 bg-neutral-100',
  payment_held:    'text-amber-700 bg-amber-50 ring-1 ring-amber-200',
  preparing:       'text-blue-700 bg-blue-50',
  picked_up:       'text-purple-700 bg-purple-50',
  in_transit:      'text-orange-700 bg-orange-50',
  delivered:       'text-teal-700 bg-teal-50',
  confirmed:       'text-green-700 bg-green-50',
  completed:       'text-green-800 bg-green-100',
  disputed:        'text-red-700 bg-red-50 ring-1 ring-red-200',
  refunded:        'text-neutral-500 bg-neutral-100',
}
// next='' means special action (ready_for_pickup flag, not a status change)
const NEXT_STATUS: Record<string, { label: string; next: string; icon: typeof Truck; special?: string }> = {
  payment_held: { label: 'Start preparing',         next: 'preparing',  icon: Package },
  preparing:    { label: 'Ready for pickup',         next: '',           icon: Truck, special: 'ready_for_pickup' },
  picked_up:    { label: 'Mark in transit',          next: 'in_transit', icon: Truck },
}

// Filter tab definitions
const TABS = [
  { key: 'all',       label: 'All',         statuses: null },
  { key: 'new',       label: 'New',         statuses: ['payment_held'] },
  { key: 'preparing', label: 'Preparing',   statuses: ['preparing', 'picked_up'] },
  { key: 'transit',   label: 'In transit',  statuses: ['in_transit'] },
  { key: 'delivered', label: 'Delivered',   statuses: ['delivered', 'confirmed'] },
  { key: 'completed', label: 'Completed',   statuses: ['completed'] },
  { key: 'disputed',  label: 'Disputed',    statuses: ['disputed'] },
]

// ── Props ────────────────────────────────────────────────────────────────────
interface OrdersTabProps {
  orders: Order[]
  sellerId: string
  onOrdersChange: (updated: Order[]) => void
}

const PAGE_SIZE = 50

export function OrdersTab({ orders, sellerId, onOrdersChange }: OrdersTabProps) {
  const [tab, setTab]         = useState('all')
  const [search, setSearch]   = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanding, setExpanding] = useState<string | null>(null)
  const [updating, setUpdating]   = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [page, setPage]       = useState(1)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  // ── Derived lists ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const tabDef = TABS.find(t => t.key === tab)
    let list = orders

    if (tabDef?.statuses) {
      list = list.filter(o => tabDef.statuses!.includes(o.status))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.product?.title?.toLowerCase().includes(q) ||
        o.buyer?.full_name?.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) =>
      sortDir === 'desc'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [orders, tab, search, sortDir])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const allSelected = paginated.length > 0 && paginated.every(o => selected.has(o.id))

  function tabCount(key: string) {
    const def = TABS.find(t => t.key === key)
    if (!def?.statuses) return orders.length
    return orders.filter(o => def.statuses!.includes(o.status)).length
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(o => s.delete(o.id)); return s })
    } else {
      setSelected(prev => { const s = new Set(prev); paginated.forEach(o => s.add(o.id)); return s })
    }
  }
  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  // ── Single status update ───────────────────────────────────────────────────
  async function updateOne(orderId: string, nextStatus: string, special?: string) {
    setUpdating(prev => new Set(prev).add(orderId))
    const supabase = createClient()

    if (special === 'ready_for_pickup') {
      // Flag the order so admin can assign a rider
      const order = orders.find(o => o.id === orderId)
      if (order?.ready_for_pickup) {
        toast('Already marked as ready', { icon: '✅' })
        setUpdating(prev => { const s = new Set(prev); s.delete(orderId); return s })
        return
      }
      const { error } = await supabase
        .from('orders')
        .update({ ready_for_pickup: true })
        .eq('id', orderId)
        .eq('seller_id', sellerId)
      if (error) {
        toast.error('Could not update order')
      } else {
        onOrdersChange(orders.map(o => o.id === orderId ? { ...o, ready_for_pickup: true } : o))
        toast.success('Marked as ready for pickup — admin will assign a rider')
      }
    } else {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        .eq('seller_id', sellerId)
      if (error) {
        toast.error('Could not update order')
      } else {
        onOrdersChange(orders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
        toast.success(STATUS_LABEL[nextStatus] ?? 'Status updated')
      }
    }
    setUpdating(prev => { const s = new Set(prev); s.delete(orderId); return s })
  }

  // ── Bulk status update ─────────────────────────────────────────────────────
  async function bulkUpdate(nextStatus: string) {
    if (selected.size === 0) return
    setBulkLoading(true)
    const supabase = createClient()
    const ids = [...selected]
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .in('id', ids)
      .eq('seller_id', sellerId)

    if (error) {
      toast.error('Bulk update failed')
    } else {
      onOrdersChange(orders.map(o => ids.includes(o.id) ? { ...o, status: nextStatus } : o))
      setSelected(new Set())
      toast.success(`${ids.length} order${ids.length > 1 ? 's' : ''} updated`)
    }
    setBulkLoading(false)
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCSV() {
    const rows = [
      ['Order ID','Product','Buyer','Qty','Amount','Status','Date','City','State'],
      ...filtered.map(o => [
        o.id,
        o.product?.title ?? '',
        o.buyer?.full_name ?? '',
        o.quantity,
        o.total_amount,
        STATUS_LABEL[o.status] ?? o.status,
        new Date(o.created_at).toLocaleDateString('en-NG'),
        o.delivery_city ?? '',
        o.delivery_state ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-satoshi text-xl font-bold text-neutral-900">Orders</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{orders.length} total orders</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-xl px-4 py-2 hover:bg-neutral-50 transition-all"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto no-scrollbar flex-shrink-0">
        {TABS.map(t => {
          const count = tabCount(t.key)
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); setSelected(new Set()) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0
                ${tab === t.key
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {t.label}
              {count > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${tab === t.key ? 'bg-brand-orange text-white' : 'bg-neutral-200 text-neutral-500'}`}>
                  {count > 999 ? '999+' : count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by buyer, product or order ID…"
            className="w-full h-9 pl-9 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
          />
        </div>

        {/* Bulk action bar — only when items are selected */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 bg-brand-dark rounded-xl px-4 py-2 flex-shrink-0">
            <span className="text-white text-sm font-semibold">{selected.size} selected</span>
            <div className="w-px h-4 bg-white/20" />
            {[
              { label: 'Preparing',   status: 'preparing'  },
              { label: 'Picked up',   status: 'picked_up'  },
              { label: 'In transit',  status: 'in_transit' },
            ].map(a => (
              <button
                key={a.status}
                onClick={() => bulkUpdate(a.status)}
                disabled={bulkLoading}
                className="text-white/80 hover:text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : `→ ${a.label}`}
              </button>
            ))}
            <button
              onClick={() => setSelected(new Set())}
              className="text-white/40 hover:text-white/80 text-xs ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden flex-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package size={32} className="text-neutral-200 mb-3" />
            <p className="font-semibold text-neutral-600">No orders found</p>
            <p className="text-sm text-neutral-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-100">
                  {/* Select all */}
                  <th className="w-10 px-4 py-3">
                    <button onClick={toggleAll} className="text-neutral-400 hover:text-neutral-700">
                      {allSelected
                        ? <CheckSquare size={16} className="text-brand-orange" />
                        : <Square size={16} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs tracking-wide whitespace-nowrap">Order</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs tracking-wide">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs tracking-wide">Buyer</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-500 text-xs tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs tracking-wide">
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 hover:text-neutral-700"
                    >
                      Date {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-500 text-xs tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-500 text-xs tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {paginated.map(order => {
                  const action    = NEXT_STATUS[order.status]
                  const isUpdating = updating.has(order.id)
                  const isOpen    = expanding === order.id

                  return (
                    <React.Fragment key={order.id}>
                      <tr
                        className={`hover:bg-neutral-50 transition-colors ${selected.has(order.id) ? 'bg-orange-50/50' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <button onClick={() => toggleOne(order.id)} className="text-neutral-400 hover:text-neutral-700">
                            {selected.has(order.id)
                              ? <CheckSquare size={16} className="text-brand-orange" />
                              : <Square size={16} />}
                          </button>
                        </td>

                        {/* Order ID + expand */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpanding(isOpen ? null : order.id)}
                            className="font-mono text-xs text-neutral-500 hover:text-brand-orange transition-colors"
                          >
                            #{order.id.slice(-8).toUpperCase()}
                          </button>
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                              {order.product?.thumbnail_url
                                ? <Image src={order.product.thumbnail_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                                : <div className="w-full h-full flex items-center justify-center"><Package size={12} className="text-neutral-300" /></div>}
                            </div>
                            <span className="text-neutral-900 font-medium truncate max-w-[160px]">
                              {order.product?.title ?? '—'}
                            </span>
                          </div>
                        </td>

                        {/* Buyer */}
                        <td className="px-4 py-3">
                          <p className="text-neutral-700 font-medium">{order.buyer?.full_name ?? '—'}</p>
                          {order.buyer?.phone && (
                            <p className="text-neutral-400 text-xs">{order.buyer.phone}</p>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right">
                          <p className="font-satoshi font-bold text-neutral-900">{formatPrice(order.total_amount)}</p>
                          {order.quantity > 1 && (
                            <p className="text-xs text-neutral-400">×{order.quantity}</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3">
                          <p className="text-neutral-600 whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-neutral-400 text-xs">
                            {new Date(order.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLOR[order.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                            {STATUS_LABEL[order.status] ?? order.status}
                          </span>
                          {order.ready_for_pickup && order.status === 'preparing' && (
                            <p className="text-[11px] text-teal-600 font-semibold mt-0.5 flex items-center gap-0.5">
                              <Truck size={9} /> Ready — awaiting rider
                            </p>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          {action && !(action.special === 'ready_for_pickup' && order.ready_for_pickup) && (
                            <button
                              onClick={() => updateOne(order.id, action.next, action.special)}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:text-white hover:bg-brand-orange border border-brand-orange/30 hover:border-brand-orange px-3 py-1.5 rounded-lg transition-all ml-auto disabled:opacity-50 whitespace-nowrap"
                            >
                              {isUpdating
                                ? <Loader2 size={11} className="animate-spin" />
                                : <action.icon size={11} />}
                              {action.label}
                            </button>
                          )}
                          {action?.special === 'ready_for_pickup' && order.ready_for_pickup && (
                            <span className="text-xs text-teal-600 font-semibold whitespace-nowrap">Awaiting rider ✓</span>
                          )}
                          {order.status === 'in_transit' && (
                            <span className="text-xs text-neutral-400 whitespace-nowrap">Awaiting delivery</span>
                          )}
                          {order.status === 'completed' && (
                            <span className="text-xs text-green-600 font-semibold">Paid out ✓</span>
                          )}
                          {order.status === 'disputed' && (
                            <span className="text-xs text-red-600 font-semibold">Contact support</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded row — delivery details */}
                      {isOpen && (
                        <tr key={`${order.id}-expanded`} className="bg-neutral-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Delivery address</p>
                                <div className="flex items-start gap-1.5 text-neutral-700">
                                  <MapPin size={13} className="mt-0.5 flex-shrink-0 text-neutral-400" />
                                  <span>
                                    {[order.delivery_street, order.delivery_city, order.delivery_state]
                                      .filter(Boolean).join(', ') || '—'}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Tracking code</p>
                                <p className="font-mono text-neutral-700">{order.tracking_code || '—'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Order ID</p>
                                <p className="font-mono text-xs text-neutral-500 break-all">{order.id}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-500 flex-shrink-0">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-all"
            >
              ← Prev
            </button>
            <span className="px-3 py-1.5 bg-brand-orange text-white rounded-lg font-semibold">
              {page}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
