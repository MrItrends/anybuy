'use client'

import { Search, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4 text-center">

      {/* Illustration */}
      <div className="relative mb-8 select-none">
        {/* Big 404 */}
        <p className="font-satoshi text-[120px] sm:text-[160px] font-bold leading-none text-neutral-100">
          404
        </p>

        {/* Floating card — sits over the 404 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-card-hover px-6 py-4 flex items-center gap-3 -rotate-2">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
              <Search size={18} className="text-brand-orange" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-neutral-900">Item not found</p>
              <p className="text-xs text-neutral-400 mt-0.5">Maybe it got sold? 🤔</p>
            </div>
          </div>
        </div>

        {/* Decorative dots */}
        <div className="absolute -top-2 -right-4 w-3 h-3 rounded-full bg-brand-orange/30" />
        <div className="absolute bottom-6 -left-6 w-2 h-2 rounded-full bg-brand-green/40" />
        <div className="absolute top-8 -left-2 w-1.5 h-1.5 rounded-full bg-brand-orange/20" />
      </div>

      {/* Copy */}
      <h1 className="font-satoshi text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
        This page doesn't exist
      </h1>
      <p className="text-neutral-500 text-sm sm:text-base max-w-xs mb-8">
        The link might be broken, or the item may have already been sold.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-brand-dark text-white font-semibold px-6 py-3 rounded-2xl hover:bg-[#1a4445] transition-colors text-sm"
        >
          <Home size={16} />
          Back to home
        </a>
        <a
          href="/search"
          className="inline-flex items-center justify-center gap-2 border-2 border-neutral-200 text-neutral-700 font-semibold px-6 py-3 rounded-2xl hover:border-brand-orange hover:text-brand-orange transition-colors text-sm"
        >
          <Search size={16} />
          Browse listings
        </a>
      </div>

    </div>
  )
}
