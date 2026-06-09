'use client'

import { createClient } from '@/lib/supabase/client'
import { Package, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export interface StockListing {
  id: string
  title: string
  quantity: number
  is_available: boolean
  low_stock_threshold: number
}

interface Props {
  open: boolean
  listing: StockListing | null
  onClose: () => void
  onUpdated: (id: string, newQty: number, isAvailable: boolean) => void
}

export function StockUpdateModal({ open, listing, onClose, onUpdated }: Props) {
  const [qty, setQty]           = useState('')
  const [threshold, setThreshold] = useState('')
  const [resume, setResume]     = useState(true)
  const [saving, setSaving]     = useState(false)

  // Sync local state when listing changes
  if (!open || !listing) return null

  // Initialise only on first render for this listing (key changes handle reset)
  const initQty       = qty       || String(listing.quantity)
  const initThreshold = threshold || String(listing.low_stock_threshold)

  async function handleSave() {
    const newQty  = Math.max(0, parseInt(initQty, 10) || 0)
    const newThreshold = Math.max(1, parseInt(initThreshold, 10) || 3)
    const isAvailable  = listing!.is_available
      ? newQty > 0             // if currently live: keep live unless hits 0
      : (resume && newQty > 0) // if paused: resume only if box checked AND qty > 0

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .update({
        quantity:            newQty,
        low_stock_threshold: newThreshold,
        is_available:        isAvailable,
      })
      .eq('id', listing!.id)

    if (error) {
      toast.error('Failed to update stock')
    } else {
      toast.success(
        isAvailable && !listing!.is_available
          ? 'Stock updated — listing is now live again!'
          : 'Stock updated'
      )
      onUpdated(listing!.id, newQty, isAvailable)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-brand-orange" />
            </div>
            <div>
              <h2 className="font-satoshi font-bold text-neutral-900 text-sm leading-tight">Update stock</h2>
              <p className="text-neutral-500 text-xs truncate max-w-[180px]">{listing.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Current stock display */}
        <div className="bg-neutral-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-neutral-500">Current stock</span>
          <span className={`font-bold text-sm ${listing.quantity === 0 ? 'text-red-500' : listing.quantity <= listing.low_stock_threshold ? 'text-amber-500' : 'text-neutral-900'}`}>
            {listing.quantity} unit{listing.quantity !== 1 ? 's' : ''}
          </span>
        </div>

        {/* New quantity */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-neutral-700">New quantity</label>
          <input
            type="number"
            min="0"
            max="9999"
            value={initQty}
            onChange={e => setQty(e.target.value)}
            className="h-11 px-4 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all"
            placeholder="0"
          />
        </div>

        {/* Low stock threshold */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-neutral-700">Alert me when stock falls below</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="100"
              value={initThreshold}
              onChange={e => setThreshold(e.target.value)}
              className="h-11 px-4 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all w-28"
            />
            <span className="text-sm text-neutral-400">units</span>
          </div>
        </div>

        {/* Resume checkbox — only when listing is currently paused */}
        {!listing.is_available && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resume}
              onChange={e => setResume(e.target.checked)}
              className="w-4 h-4 accent-brand-orange rounded"
            />
            <span className="text-sm text-neutral-700">Resume listing after saving</span>
          </label>
        )}

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-orange hover:bg-[#e85a2d] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-wait"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
