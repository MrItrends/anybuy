'use client'

import { ProductCard } from '@/components/ui/ProductCard'
import type { Product } from '@anybuy/types'
import Link from 'next/link'

interface SectionRowProps {
  title: string
  subtitle?: string
  emoji?: string   // kept for API compat — no longer rendered
  products: Product[]
  seeAllHref?: string
}

export function SectionRow({ title, subtitle, products, seeAllHref }: SectionRowProps) {
  if (products.length === 0) return null

  // Callers fetch 6 items so we can detect overflow without a second query.
  // We always render at most 5; "See all" only appears when a 6th item exists.
  const hasMore    = products.length > 5
  const visible    = products.slice(0, 5)
  const showSeeAll = hasMore && !!seeAllHref

  return (
    <section>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between mb-6">
        <div>
          <h2 className="font-satoshi text-2xl font-black text-neutral-900 tracking-tight leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {showSeeAll && (
          <Link
            href={seeAllHref!}
            className="text-sm font-bold text-brand-orange hover:text-brand-orange/80 transition-colors flex-shrink-0 ml-4 pb-0.5"
          >
            See all →
          </Link>
        )}
      </div>

      {/* Horizontal scroll shelf — same container, cards scroll within it */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {visible.map(p => (
            <div key={p.id} className="flex-shrink-0 w-[calc((100%-48px)/5)] min-w-[140px]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SectionRowSkeleton() {
  return (
    <section>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-neutral-200 rounded animate-pulse" />
          <div className="h-4 w-60 bg-neutral-100 rounded animate-pulse" />
        </div>
        <div className="h-4 w-14 bg-neutral-200 rounded animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[calc((100%-48px)/5)] min-w-[140px]">
              <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-card animate-pulse">
                <div className="aspect-square bg-neutral-200 flex-shrink-0" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-4 bg-neutral-200 rounded w-3/4" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
