'use client'

import { createClient } from '@/lib/supabase/client'
import type { AdminRole } from '../page'
import {
  BadgeCheck, Building2, CheckCircle2, ChevronDown,
  Clock, ExternalLink, Phone, User, XCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerRecord {
  user_id: string
  store_name: string
  kyc_status: 'pending' | 'submitted' | 'approved' | 'rejected'
  seller_tier: number
  kyc_nin: string | null
  kyc_id_front_url: string | null
  kyc_selfie_url: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  profiles: {
    full_name: string
    email: string
    phone: string | null
  } | null
}

type KycFilter = 'submitted' | 'approved' | 'rejected'

const KYC_TABS: { key: KycFilter; label: string }[] = [
  { key: 'submitted', label: 'Pending review' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
]

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="KYC document"
        className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Seller card ──────────────────────────────────────────────────────────────

function SellerCard({
  seller,
  canApprove,
  onApprove,
  onReject,
}: {
  seller: SellerRecord
  canApprove: boolean
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const [expanded,   setExpanded]   = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const profile = seller.profiles

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl overflow-hidden">
        {/* Summary row */}
        <button
          onClick={() => setExpanded(o => !o)}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-orange font-bold text-sm">
              {seller.store_name?.[0]?.toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{seller.store_name}</p>
            <p className="text-white/40 text-xs truncate">{profile?.full_name} · {profile?.email}</p>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold flex-shrink-0
            ${seller.kyc_status === 'approved'  ? 'bg-green-500/15 text-green-400'
            : seller.kyc_status === 'rejected'  ? 'bg-red-500/15 text-red-400'
            : 'bg-amber-500/15 text-amber-400'}`}>
            {seller.kyc_status === 'approved'  ? <CheckCircle2 size={11} />
            : seller.kyc_status === 'rejected'  ? <XCircle size={11} />
            : <Clock size={11} />}
            {seller.kyc_status === 'submitted' ? 'Pending' : seller.kyc_status.charAt(0).toUpperCase() + seller.kyc_status.slice(1)}
          </div>

          <span className="text-white/30 text-xs flex-shrink-0 hidden sm:block">{seller.store_name}</span>
          <ChevronDown
            size={14}
            className={`text-white/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 space-y-5">
            {/* Personal info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <InfoField icon={User}     label="Full name"    value={profile?.full_name ?? '—'} />
              <InfoField icon={Phone}    label="Phone"        value={profile?.phone ?? '—'} />
              <InfoField icon={Building2} label="NIN"         value={seller.kyc_nin ?? '—'} mono />
            </div>

            {/* Bank info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <InfoField label="Bank"           value={seller.bank_name ?? '—'} />
              <InfoField label="Account number" value={seller.bank_account_number ?? '—'} mono />
              <InfoField label="Account name"   value={seller.bank_account_name ?? '—'} />
            </div>

            {/* KYC images */}
            {(seller.kyc_id_front_url || seller.kyc_selfie_url) && (
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">
                  Identity documents
                </p>
                <div className="flex gap-3">
                  {seller.kyc_id_front_url && (
                    <button
                      onClick={() => setLightboxSrc(seller.kyc_id_front_url!)}
                      className="relative group"
                    >
                      <img
                        src={seller.kyc_id_front_url}
                        alt="ID card"
                        className="w-32 h-24 rounded-xl object-cover border border-white/10 group-hover:border-brand-orange/50 transition-all"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                        <ExternalLink size={16} className="text-white" />
                      </div>
                      <p className="text-white/40 text-[10px] mt-1.5 text-center">ID card (front)</p>
                    </button>
                  )}
                  {seller.kyc_selfie_url && (
                    <button
                      onClick={() => setLightboxSrc(seller.kyc_selfie_url!)}
                      className="relative group"
                    >
                      <img
                        src={seller.kyc_selfie_url}
                        alt="Selfie"
                        className="w-32 h-24 rounded-xl object-cover border border-white/10 group-hover:border-brand-orange/50 transition-all"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-xl">
                        <ExternalLink size={16} className="text-white" />
                      </div>
                      <p className="text-white/40 text-[10px] mt-1.5 text-center">Selfie with ID</p>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {canApprove && seller.kyc_status === 'submitted' && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => onApprove(seller.user_id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-semibold text-sm rounded-xl transition-all border border-green-500/20"
                >
                  <CheckCircle2 size={14} />
                  Approve & move to Tier 2
                </button>
                <button
                  onClick={() => onReject(seller.user_id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm rounded-xl transition-all border border-red-500/20"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            )}

            {seller.kyc_status === 'approved' && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <BadgeCheck size={15} />
                <span>Verified Seller · Tier {seller.seller_tier}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function InfoField({ icon: Icon, label, value, mono }: {
  icon?: typeof User
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-white/30" />}
        <p className="text-white/30 text-[11px] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-white/80 text-sm ${mono ? 'font-mono tracking-widest' : ''}`}>{value}</p>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function SellersTab({ adminRole }: { adminRole: AdminRole }) {
  const canApprove = ['super_admin', 'order_admin', 'technical_admin'].includes(adminRole)

  const [sellers,    setSellers]    = useState<SellerRecord[]>([])
  const [filter,     setFilter]     = useState<KycFilter>('submitted')
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { fetchSellers() }, [filter])

  async function fetchSellers() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('seller_profiles')
      .select(`
        user_id, store_name, kyc_status, seller_tier,
        kyc_nin, kyc_id_front_url, kyc_selfie_url,
        bank_name, bank_account_number, bank_account_name,
        profiles:profiles!user_id(full_name, email, phone)
      `)
      .eq('kyc_status', filter)
      .order('user_id', { ascending: false })

    if (error) {
      console.error('[SellersTab] fetch error:', error.code, error.message, error.details)
      toast.error('Failed to load sellers')
    } else {
      setSellers((data ?? []).map((s: any) => ({
        ...s,
        profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles,
      })))
    }
    setLoading(false)
  }

  async function handleApprove(userId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('seller_profiles')
      .update({
        kyc_status:    'approved',
        seller_tier:   2,
        listing_limit: 30,
        verified_seller: true,
      })
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to approve seller')
    } else {
      toast.success('Seller approved — moved to Tier 2')
      setSellers(prev => prev.filter(s => s.user_id !== userId))
    }
  }

  async function handleReject(userId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('seller_profiles')
      .update({ kyc_status: 'rejected' })
      .eq('user_id', userId)

    if (error) {
      toast.error('Failed to reject seller')
    } else {
      toast.success('Seller verification rejected')
      setSellers(prev => prev.filter(s => s.user_id !== userId))
    }
  }

  const pendingCount = filter === 'submitted' ? sellers.length : undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-satoshi text-xl font-bold text-white">Sellers</h1>
        <p className="text-white/40 text-sm mt-1">
          Review identity submissions and manage seller trust tiers.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit">
        {KYC_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${filter === t.key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white hover:bg-white/[0.04]'}`}
          >
            {t.label}
            {t.key === 'submitted' && pendingCount !== undefined && pendingCount > 0 && (
              <span className="ml-2 bg-brand-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sellers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <BadgeCheck size={22} className="text-white/20" />
          </div>
          <p className="text-white/40 text-sm">
            {filter === 'submitted' ? 'No pending verifications' : `No ${filter} sellers`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map(seller => (
            <SellerCard
              key={seller.user_id}
              seller={seller}
              canApprove={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
