'use client'

import { formatPrice } from '@anybuy/utils'
import {
  AlertCircle, ArrowRight, BadgeCheck, Clock, Eye,
  Package, ShieldCheck, Star, TrendingUp,
  Wallet, XCircle, Zap,
} from 'lucide-react'
import type { Order } from './OrdersTab'
import type { Listing } from '../page'

interface EarningsBreakdown {
  totalRevenue: number
  inEscrow: number
  withdrawable: number
  withdrawn: number
  refunded: number
}

interface OverviewTabProps {
  user: { full_name: string; rating?: number; rating_count?: number } | null
  profile: { store_name: string; verified_seller: boolean; response_rate: number } | null
  listings: Listing[]
  orders: Order[]
  earnings: EarningsBreakdown
  withdrawn: number
  sellerTier: number
  kycStatus: 'pending' | 'submitted' | 'approved' | 'rejected'
  listingLimit: number | null
  onGoToOrders: () => void
  onGoToPayouts: () => void
}

export function OverviewTab({
  user, profile, listings, orders, earnings,
  sellerTier, kycStatus, listingLimit,
  onGoToOrders, onGoToPayouts,
}: OverviewTabProps) {
  const activeListings = listings.filter(l => l.is_available)
  const totalViews     = listings.reduce((s, l) => s + (l.view_count ?? 0), 0)
  const pendingCount   = orders.filter(o =>
    ['payment_held', 'preparing', 'picked_up', 'in_transit'].includes(o.status)
  ).length

  // Listing limit warning: show when approaching 80% of limit
  const showLimitWarning = listingLimit !== null && listings.length >= Math.floor(listingLimit * 0.8)

  return (
    <div className="space-y-6">
      {/* ── KYC status banner ──────────────────────────────────────────── */}
      {kycStatus === 'pending' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-sm">Complete your identity verification</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Verify your identity to unlock 30 listings, live selling, and faster payouts.
            </p>
          </div>
          <a
            href="/sell"
            className="flex-shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap"
          >
            Verify now →
          </a>
        </div>
      )}

      {kycStatus === 'submitted' && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4">
          <Clock size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 text-sm">Verification under review</p>
            <p className="text-blue-600 text-xs mt-0.5">
              We'll review your documents within 24 hours and email you when approved.
            </p>
          </div>
        </div>
      )}

      {kycStatus === 'rejected' && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">Verification rejected</p>
            <p className="text-red-600 text-xs mt-0.5">
              Your documents could not be verified. Please resubmit with clearer photos.
            </p>
          </div>
          <a
            href="/sell"
            className="flex-shrink-0 text-xs font-bold text-red-700 hover:text-red-900 transition-colors whitespace-nowrap"
          >
            Resubmit →
          </a>
        </div>
      )}

      {/* Listing limit warning */}
      {showLimitWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Package size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              Approaching listing limit ({listings.length}/{listingLimit})
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Verify your identity to increase your limit to 30 listings.
            </p>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="font-satoshi text-2xl font-bold text-neutral-900">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-neutral-500 text-sm mt-1">Here's how your store is performing today.</p>
      </div>

      {/* Earnings cards */}
      <div>
        <h2 className="font-satoshi font-bold text-neutral-800 mb-3 text-sm uppercase tracking-wide">Earnings</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Total revenue',
              value: formatPrice(earnings.totalRevenue),
              sub: 'All completed sales',
              icon: TrendingUp,
              color: 'bg-green-50 text-green-600',
            },
            {
              label: 'In escrow',
              value: formatPrice(earnings.inEscrow),
              sub: 'Held until buyer confirms',
              icon: ShieldCheck,
              color: 'bg-amber-50 text-amber-600',
            },
            {
              label: 'Withdrawable',
              value: formatPrice(earnings.withdrawable),
              sub: 'Available to withdraw',
              icon: Wallet,
              color: 'bg-brand-orange/10 text-brand-orange',
              action: earnings.withdrawable > 0 ? onGoToPayouts : undefined,
              actionLabel: 'Withdraw →',
            },
            {
              label: 'Refunded',
              value: formatPrice(earnings.refunded),
              sub: 'Returned to buyers',
              icon: AlertCircle,
              color: 'bg-red-50 text-red-500',
            },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-card flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon size={18} />
              </div>
              <div>
                <p className="font-satoshi text-2xl font-bold text-neutral-900 leading-none">{card.value}</p>
                <p className="text-neutral-400 text-xs mt-1">{card.sub}</p>
              </div>
              {card.action && (
                <button
                  onClick={card.action}
                  className="text-xs font-semibold text-brand-orange hover:underline text-left"
                >
                  {card.actionLabel}
                </button>
              )}
              {!card.action && (
                <p className="text-xs font-semibold text-neutral-700">{card.label}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Store stats */}
      <div>
        <h2 className="font-satoshi font-bold text-neutral-800 mb-3 text-sm uppercase tracking-wide">Store stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total listings',  value: listings.length,             icon: Package,    color: 'bg-blue-50 text-blue-600' },
            { label: 'Active listings', value: activeListings.length,       icon: Zap,        color: 'bg-green-50 text-green-600' },
            { label: 'Total views',     value: totalViews.toLocaleString(), icon: Eye,        color: 'bg-purple-50 text-purple-600' },
            { label: 'Orders pending',  value: pendingCount,                icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-card">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}>
                <stat.icon size={16} />
              </div>
              <p className="font-satoshi text-xl font-bold text-neutral-900">{stat.value}</p>
              <p className="text-neutral-400 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {pendingCount > 0 && (
        <button
          onClick={onGoToOrders}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-amber-100 transition-colors text-left"
        >
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              {pendingCount} order{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your attention
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Fulfil orders to release escrow to your account.</p>
          </div>
          <ArrowRight size={16} className="text-amber-500 flex-shrink-0" />
        </button>
      )}

      {earnings.withdrawable > 0 && (
        <button
          onClick={onGoToPayouts}
          className="w-full bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3 hover:bg-green-100 transition-colors text-left"
        >
          <Wallet size={20} className="text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 text-sm">
              {formatPrice(earnings.withdrawable)} is ready to withdraw
            </p>
            <p className="text-green-600 text-xs mt-0.5">Add your bank account and cash out.</p>
          </div>
          <ArrowRight size={16} className="text-green-600 flex-shrink-0" />
        </button>
      )}

      {/* Seller health */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-amber-400 fill-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-900 text-sm">
              {user?.rating && (user.rating) > 0 ? `${(user.rating).toFixed(1)} seller rating` : 'No ratings yet'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {user?.rating_count && user.rating_count > 0
                ? `${user.rating_count} verified review${user.rating_count > 1 ? 's' : ''}`
                : 'Complete your first sale to get reviewed'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-dark/5 flex items-center justify-center flex-shrink-0">
            <BadgeCheck size={20} className={profile?.verified_seller ? 'text-brand-green' : 'text-neutral-300'} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-900 text-sm">
              {profile?.verified_seller ? 'Verified seller' : 'Not yet verified'}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Response rate: {profile?.response_rate ?? 100}%
            </p>
          </div>
        </div>
      </div>

      {/* Escrow info */}
      <div className="bg-brand-dark rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={18} className="text-brand-orange" />
          <h3 className="font-satoshi font-bold text-base">How escrow works for sellers</h3>
        </div>
        <ol className="space-y-2 text-sm text-white/70">
          {[
            'Buyer pays — funds held securely by AnyBuy',
            'You prepare and ship the item',
            'Buyer receives and inspects the item',
            'Buyer confirms receipt → funds released to your withdrawable balance',
            'Withdraw to your bank at any time',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
