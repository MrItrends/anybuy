'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { formatPrice } from '@anybuy/utils'
import {
  AlertCircle, Box, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Copy, Info, Loader2, MapPin, PackageCheck,
  RefreshCw, RotateCcw, Search, ShieldCheck, Star,
  Truck, X, XCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

// ═══════════════════════════ Types ═══════════════════════════════════════════

interface OrderReturn {
  id: string
  type: 'return' | 'exchange' | 'refund'
  reason: string
  description: string | null
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  created_at: string
}

interface Order {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  delivery_fee: number | null
  status: string
  delivery_street: string | null
  delivery_city: string | null
  delivery_state: string | null
  tracking_code: string | null
  confirmation_code: string | null
  estimated_delivery_at: string | null
  confirmed_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  product: { title: string; thumbnail_url: string | null } | null
  seller: { id: string; full_name: string } | null
  has_review?: boolean
  return_request?: OrderReturn | null
}

// ═══════════════════════════ Constants ═══════════════════════════════════════

const RETURN_WINDOW_DAYS = 7

const ACTIVE_STATUSES    = new Set(['payment_held','preparing','picked_up','in_transit','delivered'])
const HISTORY_STATUSES   = new Set(['confirmed','completed','cancelled','refunded'])
const ISSUE_STATUSES     = new Set(['disputed'])

const PIPELINE = [
  { key: 'payment_held', label: 'Paid'         },
  { key: 'preparing',    label: 'Preparing'    },
  { key: 'picked_up',    label: 'With Courier' },
  { key: 'in_transit',   label: 'On the Way'   },
  { key: 'delivered',    label: 'Delivered'    },
  { key: 'confirmed',    label: 'Completed'    },
]
const PIPELINE_KEYS = PIPELINE.map(s => s.key)

function pipelineIdx(status: string) {
  if (['confirmed','completed'].includes(status)) return 5
  return Math.max(0, PIPELINE_KEYS.indexOf(status))
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Awaiting Payment', color: 'text-neutral-500', bg: 'bg-neutral-100'  },
  payment_held:    { label: 'Payment Held',     color: 'text-amber-700',   bg: 'bg-amber-50'     },
  preparing:       { label: 'Seller Preparing', color: 'text-amber-700',   bg: 'bg-amber-50'     },
  picked_up:       { label: 'With Courier',     color: 'text-blue-700',    bg: 'bg-blue-50'      },
  in_transit:      { label: 'On the Way',       color: 'text-blue-700',    bg: 'bg-blue-50'      },
  delivered:       { label: 'Delivered',        color: 'text-teal-700',    bg: 'bg-teal-50'      },
  confirmed:       { label: 'Completed',        color: 'text-green-700',   bg: 'bg-green-50'     },
  completed:       { label: 'Completed',        color: 'text-green-700',   bg: 'bg-green-50'     },
  disputed:        { label: 'Under Dispute',    color: 'text-red-700',     bg: 'bg-red-50'       },
  refunded:        { label: 'Refunded',         color: 'text-neutral-600', bg: 'bg-neutral-100'  },
  cancelled:       { label: 'Cancelled',        color: 'text-neutral-500', bg: 'bg-neutral-100'  },
}

const RETURN_REASONS = [
  { value: 'wrong_item',         label: 'Wrong item received'        },
  { value: 'damaged',            label: 'Item arrived damaged'       },
  { value: 'not_as_described',   label: 'Not as described'           },
  { value: 'quality_issue',      label: 'Quality not as expected'    },
  { value: 'not_received',       label: 'Item not received'          },
  { value: 'changed_mind',       label: 'Changed my mind'            },
  { value: 'other',              label: 'Other'                      },
]

const PAGE_SIZE = 10

// ═══════════════════════════ Small components ════════════════════════════════

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: 'text-neutral-500', bg: 'bg-neutral-100' }
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${m.color} ${m.bg}`}>
      {m.label}
    </span>
  )
}

function PipelineStepper({ status }: { status: string }) {
  const current = pipelineIdx(status)
  return (
    <div className="flex items-center overflow-x-auto no-scrollbar px-4 py-3">
      {PIPELINE.map((step, i) => {
        const done = i < current, active = i === current, isLast = i === PIPELINE.length - 1
        return (
          <div key={step.key} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                done   ? 'bg-brand-orange border-brand-orange' :
                active ? 'bg-white border-brand-orange' : 'bg-white border-neutral-200'
              }`}>
                {done   && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
                {active && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
              </div>
              <span className={`text-[9px] font-semibold text-center leading-tight ${
                done || active ? 'text-neutral-700' : 'text-neutral-300'
              }`}>{step.label}</span>
            </div>
            {!isLast && (
              <div className={`h-px w-6 sm:w-10 mx-0.5 mb-4 flex-shrink-0 ${done ? 'bg-brand-orange' : 'bg-neutral-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange(n)}
          className="transition-transform hover:scale-110">
          <Star size={22} className={(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════ Review modal ════════════════════════════════════

function ReviewModal({ order, onClose, onSubmitted }: {
  order: Order; onClose: () => void; onSubmitted: () => void
}) {
  const { user } = useAuthStore()
  const [rating, setRating]   = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!rating) { toast.error('Please select a star rating'); return }
    if (!user || !order.seller) return
    setLoading(true)
    const { error } = await createClient().from('reviews').insert({
      order_id: order.id, buyer_id: user.id, seller_id: order.seller.id, rating, comment: comment.trim() || null,
    })
    if (error) toast.error('Could not submit review. Please try again.')
    else { toast.success('Review submitted — thank you!'); onSubmitted() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-satoshi font-black text-lg text-neutral-900 mb-1">Rate your experience</h3>
        <p className="text-sm text-neutral-500 mb-5">Review for <span className="font-semibold text-neutral-700">{order.seller?.full_name}</span></p>
        <div className="flex justify-center mb-5"><StarPicker value={rating} onChange={setRating} /></div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          placeholder="How was your experience with this seller?"
          className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand-orange transition-colors mb-5" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading || !rating}
            className="flex-1 h-11 rounded-xl bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />} Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════ Return / Refund / Exchange modal ════════════════

const RETURN_POLICY = [
  { icon: RotateCcw,   title: 'Returns',   body: `Return eligible items within ${RETURN_WINDOW_DAYS} days of delivery confirmation. Item must be unused and in original condition.` },
  { icon: RefreshCw,   title: 'Exchanges', body: 'Request an exchange for a different size or colour within 7 days. Subject to seller availability.' },
  { icon: ShieldCheck, title: 'Refunds',   body: 'Approved refunds are released from escrow within 3–5 business days back to your original payment method.' },
  { icon: Clock,       title: 'Delivery',  body: 'Standard delivery: 1–4 business days within Lagos. 3–7 business days nationally. Delivery cost shown at checkout.' },
]

function ReturnModal({ order, onClose, onSubmitted }: {
  order: Order; onClose: () => void; onSubmitted: (req: OrderReturn) => void
}) {
  const { user } = useAuthStore()
  const [type, setType]           = useState<'return' | 'exchange' | 'refund'>('return')
  const [reason, setReason]       = useState('')
  const [description, setDesc]    = useState('')
  const [loading, setLoading]     = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  async function submit() {
    if (!reason) { toast.error('Please select a reason'); return }
    if (!user) return
    setLoading(true)
    const { data, error } = await createClient().from('order_returns').insert({
      order_id: order.id, buyer_id: user.id, type, reason, description: description.trim() || null,
    }).select().single()
    if (error) {
      toast.error('Could not submit request. Please try again.')
    } else {
      toast.success('Request submitted. We\'ll notify you of the outcome.')
      onSubmitted(data as OrderReturn)
    }
    setLoading(false)
  }

  const typeLabels = { return: 'Return Item', exchange: 'Exchange Item', refund: 'Request Refund' }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-satoshi font-black text-lg text-neutral-900">Need help with this order?</h3>
              <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[280px]">{order.product?.title}</p>
            </div>
            <button onClick={onClose} className="text-neutral-300 hover:text-neutral-600 transition-colors mt-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Type selector */}
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">What do you need?</p>
            <div className="grid grid-cols-3 gap-2">
              {(['return','exchange','refund'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    type === t ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                  }`}>
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Reason</p>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-neutral-200 text-sm text-neutral-800 focus:outline-none focus:border-brand-orange transition-colors bg-white">
              <option value="">Select a reason…</option>
              {RETURN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Additional details (optional)</p>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Describe the issue in more detail…"
              className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-brand-orange transition-colors" />
          </div>

          {/* Policy accordion */}
          <div>
            <button type="button" onClick={() => setShowPolicy(s => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-brand-orange hover:text-brand-orange/80 transition-colors">
              <Info size={13} />
              View return & refund policy
              <ChevronDown size={13} className={`transition-transform ${showPolicy ? 'rotate-180' : ''}`} />
            </button>
            {showPolicy && (
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                {RETURN_POLICY.map(p => (
                  <div key={p.title} className="flex gap-3 p-3 bg-neutral-50 rounded-xl">
                    <p.icon size={15} className="text-brand-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-neutral-800">{p.title}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 border-t border-neutral-100 flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={loading || !reason}
            className="flex-1 h-11 rounded-xl bg-brand-dark hover:bg-brand-dark/90 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════ Order card ══════════════════════════════════════

function OrderCard({
  order,
  onConfirm,
  onReview,
  onReturn,
  onCancel,
  confirming,
}: {
  order: Order
  onConfirm: (id: string) => void
  onReview:  (o: Order) => void
  onReturn:  (o: Order) => void
  onCancel:  (id: string) => void
  confirming: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  const isActive    = ACTIVE_STATUSES.has(order.status)
  const isDone      = ['confirmed','completed'].includes(order.status)
  const isCancelled = ['cancelled','refunded'].includes(order.status)
  const isDisputed  = order.status === 'disputed'
  const isDelivered = order.status === 'delivered'
  const showOTC     = ['in_transit','picked_up','delivered'].includes(order.status) && order.confirmation_code

  // Return window: 7 days from confirmed_at or updated_at proxy
  const canReturn = isDone && !order.return_request && (() => {
    const base = order.confirmed_at ?? order.created_at
    return (Date.now() - new Date(base).getTime()) < RETURN_WINDOW_DAYS * 864e5
  })()

  const dateStr = new Date(order.created_at).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const estDelivery = order.estimated_delivery_at
    ? new Date(order.estimated_delivery_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">

      {/* ── Main row ── */}
      <div className="p-4 flex gap-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
          {order.product?.thumbnail_url
            ? <Image src={order.product.thumbnail_url} alt={order.product.title ?? ''} fill className="object-cover" sizes="56px" />
            : <div className="w-full h-full flex items-center justify-center"><Box size={18} className="text-neutral-300" /></div>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-neutral-900 text-sm leading-snug line-clamp-2 flex-1 min-w-0">
              {order.product?.title ?? 'Product'}
              {order.quantity > 1 && <span className="text-neutral-400 font-normal"> ×{order.quantity}</span>}
            </p>
            <span className="font-satoshi font-bold text-sm text-neutral-900 flex-shrink-0">{formatPrice(order.total_amount)}</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">{order.seller?.full_name ?? 'Seller'} · {dateStr}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusPill status={order.status} />
            {estDelivery && isActive && (
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <Truck size={10} /> Est. {estDelivery}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle for history/issues */}
        {(isDone || isCancelled || isDisputed) && (
          <button onClick={() => setExpanded(s => !s)}
            className="self-start mt-1 text-neutral-300 hover:text-neutral-600 transition-colors flex-shrink-0">
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Active: pipeline stepper ── */}
      {isActive && (
        <div className="border-t border-neutral-50">
          <PipelineStepper status={order.status} />
        </div>
      )}

      {/* ── Expandable detail (history/issues) ── */}
      {(isDone || isCancelled || isDisputed) && expanded && (
        <div className="border-t border-neutral-50 px-4 pb-2 pt-3 space-y-2">
          {order.delivery_street && (
            <p className="flex items-start gap-1.5 text-xs text-neutral-500">
              <MapPin size={11} className="flex-shrink-0 mt-0.5" />
              {[order.delivery_street, order.delivery_city, order.delivery_state].filter(Boolean).join(', ')}
            </p>
          )}
          {order.tracking_code && (
            <p className="text-xs text-neutral-500 flex items-center gap-1.5">
              <Truck size={11} /> Tracking: <span className="font-mono font-semibold text-neutral-700">{order.tracking_code}</span>
            </p>
          )}
          {order.cancel_reason && (
            <p className="text-xs text-neutral-500 flex items-start gap-1.5">
              <XCircle size={11} className="flex-shrink-0 mt-0.5 text-red-400" /> {order.cancel_reason}
            </p>
          )}
          {order.return_request && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-xs font-bold text-amber-700 capitalize">{order.return_request.type} request — {order.return_request.status}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                {RETURN_REASONS.find(r => r.value === order.return_request!.reason)?.label ?? order.return_request.reason}
              </p>
            </div>
          )}
          {order.delivery_fee != null && order.delivery_fee > 0 && (
            <p className="text-xs text-neutral-400">Delivery fee: {formatPrice(order.delivery_fee)}</p>
          )}
        </div>
      )}

      {/* ── OTC ── */}
      {showOTC && (
        <div className="mx-4 mb-3 bg-brand-dark rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck size={13} className="text-brand-orange" />
            <p className="text-xs font-bold text-white">Your Delivery Code</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-mono text-2xl font-black text-brand-orange tracking-[0.2em]">{order.confirmation_code}</p>
            <button onClick={() => { try { navigator.clipboard.writeText(order.confirmation_code!) } catch {} toast.success('Code copied') }}
              className="text-white/40 hover:text-white transition-colors"><Copy size={15} /></button>
          </div>
          <p className="text-[10px] text-white/50 mt-1.5">Show this to your delivery rider. They need it to complete the handover.</p>
        </div>
      )}

      {/* ── CTAs ── */}
      <div className="px-4 pb-4 flex flex-col gap-2">

        {/* Cancellation — only before pickup */}
        {['payment_held','preparing'].includes(order.status) && (
          <button onClick={() => onCancel(order.id)}
            className="w-full h-9 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            Cancel Order
          </button>
        )}

        {/* Confirm receipt */}
        {isDelivered && (
          <>
            <button onClick={() => onConfirm(order.id)} disabled={confirming === order.id}
              className="w-full h-11 rounded-xl bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              {confirming === order.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              I've Received This Item
            </button>
            <p className="text-[10px] text-neutral-400 text-center">Confirming releases escrow payment to the seller</p>
          </>
        )}

        {/* Review */}
        {isDone && !order.has_review && (
          <button onClick={() => onReview(order)}
            className="w-full h-10 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors">
            <Star size={13} className="fill-amber-400 text-amber-400" /> Leave a Review
          </button>
        )}

        {/* Return / exchange / refund */}
        {canReturn && (
          <button onClick={() => onReturn(order)}
            className="w-full h-10 rounded-xl border-2 border-neutral-200 hover:border-brand-orange text-neutral-500 hover:text-brand-orange text-xs font-bold flex items-center justify-center gap-2 transition-all">
            <RotateCcw size={13} /> Return / Exchange / Refund
          </button>
        )}

        {/* Dispute in progress notice */}
        {isDisputed && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium">This order is under dispute. Our team is reviewing it.</p>
          </div>
        )}
      </div>

      {/* View product */}
      <Link href={`/products/${order.product_id}`}
        className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 text-xs text-neutral-400 hover:bg-neutral-50 transition-colors">
        <span>View product</span>
        <ChevronRight size={12} />
      </Link>
    </div>
  )
}

// ═══════════════════════════ Cancel confirm ═══════════════════════════════════

function CancelConfirm({ orderId, onClose, onCancelled }: {
  orderId: string; onClose: () => void; onCancelled: () => void
}) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  async function cancel() {
    setLoading(true)
    const { error } = await createClient().from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: 'Cancelled by buyer' })
      .eq('id', orderId).eq('buyer_id', user!.id)
    if (error) toast.error('Could not cancel. Please try again.')
    else { toast.success('Order cancelled.'); onCancelled() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-satoshi font-black text-lg text-neutral-900 mb-2">Cancel this order?</h3>
        <p className="text-sm text-neutral-500 mb-5">
          The order will be cancelled and your payment will be refunded from escrow within 3–5 business days.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600">Keep Order</button>
          <button onClick={cancel} disabled={loading}
            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />} Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════ Skeleton ════════════════════════════════════════

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0,1,2].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-4 animate-pulse flex gap-3">
          <div className="w-14 h-14 rounded-xl bg-neutral-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-neutral-200 rounded w-2/3" />
            <div className="h-3 bg-neutral-100 rounded w-1/3" />
            <div className="h-5 bg-neutral-100 rounded w-24 mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════ Page ════════════════════════════════════════════

type TabKey = 'active' | 'history' | 'issues'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'active',  label: 'Active'           },
  { key: 'history', label: 'History'          },
  { key: 'issues',  label: 'Returns & Issues' },
]

export default function OrdersPage() {
  const { user } = useAuthStore()
  const router   = useRouter()

  const [orders, setOrders]         = useState<Order[]>([])
  const [loading, setLoading]       = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null)
  const [returnOrder, setReturnOrder] = useState<Order | null>(null)
  const [cancelId, setCancelId]     = useState<string | null>(null)
  const [tab, setTab]               = useState<TabKey>('active')
  const [search, setSearch]         = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination when tab/search changes
  const prevTabRef = useRef(tab)
  useEffect(() => { if (prevTabRef.current !== tab || search) { setVisibleCount(PAGE_SIZE); prevTabRef.current = tab } }, [tab, search])

  useEffect(() => {
    if (!user) { router.replace('/'); return }
    fetchOrders()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOrders() {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select(`
        id, product_id, quantity, unit_price, total_amount, delivery_fee,
        status, delivery_street, delivery_city, delivery_state,
        tracking_code, confirmation_code, estimated_delivery_at,
        confirmed_at, cancelled_at, cancel_reason, created_at,
        product:products(title, thumbnail_url),
        seller:profiles!seller_id(id, full_name)
      `)
      .eq('buyer_id', user!.id)
      .order('created_at', { ascending: false })

    const mapped: Order[] = (data ?? []).map((o: any) => ({
      ...o,
      product: Array.isArray(o.product) ? o.product[0] : o.product,
      seller:  Array.isArray(o.seller)  ? o.seller[0]  : o.seller,
    }))

    // Fetch reviews for completed orders
    const doneIds = mapped.filter(o => ['confirmed','completed'].includes(o.status)).map(o => o.id)
    if (doneIds.length) {
      const { data: reviews } = await supabase.from('reviews').select('order_id').in('order_id', doneIds)
      const reviewed = new Set((reviews ?? []).map((r: any) => r.order_id))
      mapped.forEach(o => { o.has_review = reviewed.has(o.id) })
    }

    // Fetch return requests
    const { data: returns } = await supabase
      .from('order_returns')
      .select('id, order_id, type, reason, description, status, created_at')
      .eq('buyer_id', user!.id)
    const returnMap = new Map((returns ?? []).map((r: any) => [r.order_id, r]))
    mapped.forEach(o => { o.return_request = returnMap.get(o.id) ?? null })

    setOrders(mapped)
    setLoading(false)
  }

  // Tab filtering
  const tabOrders = useMemo(() => {
    let list = orders
    if (tab === 'active')  list = list.filter(o => ACTIVE_STATUSES.has(o.status))
    if (tab === 'history') list = list.filter(o => HISTORY_STATUSES.has(o.status))
    if (tab === 'issues')  list = list.filter(o => ISSUE_STATUSES.has(o.status) || !!o.return_request)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o => o.product?.title?.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
    }
    return list
  }, [orders, tab, search])

  const visible = tabOrders.slice(0, visibleCount)
  const hasMore = tabOrders.length > visibleCount

  const counts = useMemo(() => ({
    active:  orders.filter(o => ACTIVE_STATUSES.has(o.status)).length,
    history: orders.filter(o => HISTORY_STATUSES.has(o.status)).length,
    issues:  orders.filter(o => ISSUE_STATUSES.has(o.status) || !!o.return_request).length,
  }), [orders])

  async function confirmReceipt(orderId: string) {
    setConfirming(orderId)
    const { error } = await createClient().from('orders')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', orderId).eq('buyer_id', user!.id)
    if (error) toast.error('Could not confirm receipt.')
    else {
      toast.success('Receipt confirmed! Payment released to seller.')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed', confirmed_at: new Date().toISOString() } : o))
    }
    setConfirming(null)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="h-8 w-32 bg-neutral-200 rounded animate-pulse mb-6" />
      <Skeleton />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-satoshi text-2xl font-bold text-neutral-900 mb-5">My Orders</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by product name…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-neutral-200 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-brand-orange transition-colors bg-white" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              tab === t.key ? 'bg-brand-dark text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-neutral-300 text-neutral-600'
              }`}>{counts[t.key] > 9 ? '9+' : counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Policy notice for history tab */}
      {tab === 'history' && (
        <div className="mb-5 bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-brand-orange" />
            <p className="text-xs font-bold text-neutral-700 uppercase tracking-wide">Policies</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {RETURN_POLICY.map(p => (
              <div key={p.title} className="flex gap-2">
                <p.icon size={12} className="text-brand-orange flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-neutral-700">{p.title}</p>
                  <p className="text-[10px] text-neutral-400 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && (
        <div className="text-center py-16 bg-neutral-50 rounded-2xl">
          <Box size={28} className="text-neutral-300 mx-auto mb-3" />
          <p className="font-semibold text-neutral-700 text-sm">
            {search ? 'No orders match your search' :
             tab === 'active'  ? 'No active orders' :
             tab === 'history' ? 'No past orders yet' : 'No returns or issues'}
          </p>
          {!search && tab === 'active' && (
            <Link href="/" className="mt-4 inline-block text-sm text-brand-orange font-semibold hover:underline">Start shopping →</Link>
          )}
        </div>
      )}

      {/* Order cards */}
      <div className="flex flex-col gap-3">
        {visible.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            confirming={confirming}
            onConfirm={confirmReceipt}
            onReview={setReviewOrder}
            onReturn={setReturnOrder}
            onCancel={setCancelId}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
          className="w-full mt-4 h-11 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
          Show more ({tabOrders.length - visibleCount} remaining)
        </button>
      )}

      {/* Modals */}
      {reviewOrder && (
        <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)}
          onSubmitted={() => {
            setOrders(prev => prev.map(o => o.id === reviewOrder!.id ? { ...o, has_review: true } : o))
            setReviewOrder(null)
          }} />
      )}
      {returnOrder && (
        <ReturnModal order={returnOrder} onClose={() => setReturnOrder(null)}
          onSubmitted={req => {
            setOrders(prev => prev.map(o => o.id === returnOrder!.id ? { ...o, return_request: req } : o))
            setReturnOrder(null)
          }} />
      )}
      {cancelId && (
        <CancelConfirm orderId={cancelId} onClose={() => setCancelId(null)}
          onCancelled={() => {
            setOrders(prev => prev.map(o => o.id === cancelId ? { ...o, status: 'cancelled' } : o))
            setCancelId(null)
          }} />
      )}
    </div>
  )
}
