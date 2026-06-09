'use client'

import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, ChevronDown, ChevronRight,
  ExternalLink, Loader2, MapPin, Truck, XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { AdminRole } from '../page'

interface RiderProfile {
  user_id: string
  vehicle_type: string
  vehicle_plate: string | null
  city: string
  state: string
  is_available: boolean
  status: string
  rejection_reason: string | null
  nin: string | null
  id_front_url: string | null
  id_back_url: string | null
  selfie_url: string | null
  license_number: string | null
  license_photo_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  profile: { full_name: string; email: string; phone: string | null } | null
  active_deliveries: number
}

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: '🏍️ Motorcycle',
  bicycle:    '🚲 Bicycle',
  car:        '🚗 Car',
  van:        '🚐 Van',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-500/15 text-amber-400',
  approved:  'bg-green-500/15 text-green-400',
  active:    'bg-green-500/15 text-green-400',
  rejected:  'bg-red-500/15 text-red-400',
  suspended: 'bg-neutral-500/15 text-neutral-400',
}

type FilterTab = 'pending' | 'active' | 'all'

function DocImage({ url, label }: { url: string | null; label: string }) {
  if (!url) return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-center">
      <p className="text-xs text-white/30">{label}</p>
      <p className="text-[11px] text-white/20 mt-1">Not uploaded</p>
    </div>
  )
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group relative block bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden aspect-video hover:border-brand-orange/50 transition-all">
      <img src={url} alt={label} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-[11px] text-white font-medium">{label}</span>
        <ExternalLink size={10} className="ml-auto text-white/60" />
      </div>
    </a>
  )
}

function RiderCard({
  rider,
  canManage,
  onApprove,
  onReject,
  onToggleStatus,
}: {
  rider: RiderProfile
  canManage: boolean
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
  onToggleStatus: (rider: RiderProfile) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const isPending  = rider.status === 'pending'
  const isActive   = ['active', 'approved'].includes(rider.status)

  async function approve() {
    setActionLoading(true)
    await onApprove(rider.user_id)
    setActionLoading(false)
  }

  async function submitReject(e: React.FormEvent) {
    e.preventDefault()
    if (!rejectionReason.trim()) { toast.error('Enter a rejection reason'); return }
    setActionLoading(true)
    await onReject(rider.user_id, rejectionReason.trim())
    setRejecting(false)
    setActionLoading(false)
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm
          ${isActive ? 'bg-brand-orange/15 text-brand-orange' : 'bg-white/[0.06] text-white/30'}`}>
          {rider.profile?.full_name?.[0]?.toUpperCase() ?? 'R'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white text-sm">{rider.profile?.full_name ?? 'Unknown'}</p>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[rider.status] ?? 'bg-white/10 text-white/40'}`}>
              {rider.status}
            </span>
            {rider.active_deliveries > 0 && (
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                {rider.active_deliveries} active {rider.active_deliveries === 1 ? 'delivery' : 'deliveries'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-white/35 flex-wrap">
            <span>{rider.profile?.email}</span>
            {rider.profile?.phone && <span>{rider.profile.phone}</span>}
            <span className="flex items-center gap-0.5"><MapPin size={10} />{rider.city}, {rider.state}</span>
            <span>{VEHICLE_LABELS[rider.vehicle_type] ?? rider.vehicle_type}</span>
            {rider.vehicle_plate && <span className="font-mono">{rider.vehicle_plate}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && isPending && !rejecting && (
            <>
              <button
                onClick={approve}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={actionLoading}
                className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              >
                <XCircle size={11} />Reject
              </button>
            </>
          )}
          {canManage && isActive && (
            <button
              onClick={() => onToggleStatus(rider)}
              className="text-xs text-white/35 hover:text-red-400 transition-colors font-medium"
              title="Suspend rider"
            >
              Suspend
            </button>
          )}
          {canManage && rider.status === 'suspended' && (
            <button
              onClick={() => onToggleStatus(rider)}
              className="text-xs text-green-400 hover:text-green-300 transition-colors font-medium"
            >
              Reactivate
            </button>
          )}
          <button
            onClick={() => setExpanded(x => !x)}
            className="text-white/30 hover:text-white/70 transition-colors ml-1"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Rejection reason entry */}
      {rejecting && (
        <form onSubmit={submitReject} className="border-t border-white/[0.06] px-5 py-4 flex gap-3">
          <input
            type="text"
            value={rejectionReason}
            onChange={e => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (shown to rider)…"
            className="flex-1 h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white
              placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
          />
          <button type="submit" disabled={actionLoading}
            className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50">
            {actionLoading ? <Loader2 size={11} className="animate-spin" /> : null}
            Confirm reject
          </button>
          <button type="button" onClick={() => setRejecting(false)}
            className="text-xs text-white/35 hover:text-white/70 transition-colors">
            Cancel
          </button>
        </form>
      )}

      {/* Expanded compliance docs */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-5 py-5 space-y-5">
          {/* Identity docs */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Identity documents</p>
            <div className="grid grid-cols-3 gap-3">
              <DocImage url={rider.id_front_url} label="ID — front" />
              <DocImage url={rider.id_back_url}  label="ID — back" />
              <DocImage url={rider.selfie_url}   label="Selfie with ID" />
            </div>
          </div>

          {/* NIN */}
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-white/40 mb-0.5">NIN</p>
              <p className="text-sm font-mono text-white">{rider.nin ?? '—'}</p>
            </div>
          </div>

          {/* Vehicle + license */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Vehicle & License</p>
            <div className="grid grid-cols-3 gap-3">
              <DocImage url={rider.license_photo_url} label="Driver's license" />
            </div>
            <div className="flex gap-6 mt-3">
              <div>
                <p className="text-xs text-white/40 mb-0.5">License number</p>
                <p className="text-sm font-mono text-white">{rider.license_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Plate</p>
                <p className="text-sm font-mono text-white">{rider.vehicle_plate ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Banking */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Banking details</p>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-white/40 mb-0.5">Bank</p>
                <p className="text-sm text-white">{rider.bank_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Account number</p>
                <p className="text-sm font-mono text-white">{rider.bank_account_number ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-0.5">Account name</p>
                <p className="text-sm text-white">{rider.bank_account_name ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Rejection reason (if any) */}
          {rider.rejection_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-400 mb-1">Rejection reason</p>
              <p className="text-sm text-red-300">{rider.rejection_reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RidersTab({ adminRole }: { adminRole: AdminRole }) {
  const [riders, setRiders]     = useState<RiderProfile[]>([])
  const [loading, setLoading]   = useState(true)
  const [filterTab, setFilterTab] = useState<FilterTab>('pending')

  const canManage = ['super_admin', 'order_admin'].includes(adminRole)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('rider_profiles')
      .select(`
        user_id, vehicle_type, vehicle_plate, city, state,
        is_available, status, rejection_reason,
        nin, id_front_url, id_back_url, selfie_url,
        license_number, license_photo_url,
        bank_name, bank_account_number, bank_account_name,
        profile:profiles!user_id(full_name, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[RidersTab] fetch error:', error.code, error.message)
      toast.error('Failed to load riders')
      setLoading(false)
      return
    }

    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('rider_id')
      .in('status', ['pending_assignment', 'accepted', 'picked_up', 'in_transit', 'at_delivery_point'])

    const deliveryCounts: Record<string, number> = {}
    ;(deliveries ?? []).forEach((d: any) => {
      deliveryCounts[d.rider_id] = (deliveryCounts[d.rider_id] ?? 0) + 1
    })

    setRiders((data ?? []).map((r: any) => ({
      ...r,
      profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
      active_deliveries: deliveryCounts[r.user_id] ?? 0,
    })))
    setLoading(false)
  }

  async function approveRider(userId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('rider_profiles')
      .update({ status: 'approved', rejection_reason: null })
      .eq('user_id', userId)
    if (error) { toast.error('Failed to approve'); return }
    setRiders(prev => prev.map(r => r.user_id === userId ? { ...r, status: 'approved', rejection_reason: null } : r))
    toast.success('Rider approved')
  }

  async function rejectRider(userId: string, reason: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('rider_profiles')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('user_id', userId)
    if (error) { toast.error('Failed to reject'); return }
    setRiders(prev => prev.map(r => r.user_id === userId ? { ...r, status: 'rejected', rejection_reason: reason } : r))
    toast.success('Rider rejected')
  }

  async function toggleStatus(rider: RiderProfile) {
    const next = ['active', 'approved'].includes(rider.status) ? 'suspended' : 'approved'
    const supabase = createClient()
    const { error } = await supabase.from('rider_profiles').update({ status: next }).eq('user_id', rider.user_id)
    if (error) { toast.error('Failed to update status'); return }
    setRiders(prev => prev.map(r => r.user_id === rider.user_id ? { ...r, status: next } : r))
    toast.success(`Rider ${next}`)
  }

  const pendingRiders = riders.filter(r => r.status === 'pending')
  const activeRiders  = riders.filter(r => ['active', 'approved'].includes(r.status))

  const displayedRiders = filterTab === 'pending'
    ? pendingRiders
    : filterTab === 'active'
      ? activeRiders
      : riders

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending review', count: pendingRiders.length },
    { key: 'active',  label: 'Active',         count: activeRiders.length },
    { key: 'all',     label: 'All',            count: riders.length },
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
          <h1 className="font-satoshi text-xl font-bold text-white">Riders</h1>
          <p className="text-white/45 text-sm mt-1">
            {pendingRiders.length} pending · {activeRiders.length} active
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total riders',    value: riders.length,         colorClass: 'text-blue-400' },
          { label: 'Pending review',  value: pendingRiders.length,  colorClass: 'text-amber-400' },
          { label: 'Active',          value: activeRiders.length,   colorClass: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className={`text-2xl font-satoshi font-bold ${s.colorClass}`}>{s.value}</p>
            <p className="text-xs text-white/35 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilterTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${filterTab === t.key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full
                ${t.key === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Rider list */}
      {displayedRiders.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
          <Truck size={28} className="text-white/15 mx-auto mb-3" />
          <p className="font-semibold text-white/50">
            {filterTab === 'pending' ? 'No riders pending review' : 'No riders found'}
          </p>
          <p className="text-sm text-white/30 mt-1">
            {filterTab === 'pending' ? 'New applicants will appear here for approval.' : 'Riders will appear here when they sign up.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRiders.map(rider => (
            <RiderCard
              key={rider.user_id}
              rider={rider}
              canManage={canManage}
              onApprove={approveRider}
              onReject={rejectRider}
              onToggleStatus={toggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
