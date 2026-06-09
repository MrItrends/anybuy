'use client'

import { AlertTriangle, ArrowRight, Plus } from 'lucide-react'
import Image from 'next/image'

interface Props {
  open: boolean
  existingListing: { id: string; title: string; thumbnail_url: string | null } | null
  onAddStock: () => void
  onCreateAnyway: () => void
  onClose: () => void
}

export function DuplicateWarningModal({ open, existingListing, onAddStock, onCreateAnyway, onClose }: Props) {
  if (!open || !existingListing) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">

        {/* Icon + heading */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-satoshi font-bold text-neutral-900 text-base leading-snug">
              You already have this listing
            </h2>
            <p className="text-neutral-500 text-sm mt-0.5">
              Adding a duplicate won't get more views. Add stock to the existing one instead.
            </p>
          </div>
        </div>

        {/* Existing listing preview */}
        <div className="flex items-center gap-3 bg-neutral-50 rounded-xl px-4 py-3 border border-neutral-100">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-200 flex-shrink-0">
            {existingListing.thumbnail_url
              ? <Image src={existingListing.thumbnail_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
              : <div className="w-full h-full bg-neutral-200" />}
          </div>
          <p className="text-sm font-medium text-neutral-800 truncate">{existingListing.title}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onAddStock}
            className="flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-[#e85a2d] transition-all"
          >
            <ArrowRight size={15} />
            Update stock on existing listing
          </button>
          <button
            onClick={onCreateAnyway}
            className="flex items-center justify-center gap-2 text-neutral-500 hover:text-neutral-800 font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-neutral-50 transition-all"
          >
            <Plus size={14} />
            Create new listing anyway
          </button>
        </div>

      </div>
    </div>
  )
}
