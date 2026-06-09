'use client'

import { cn } from '@/lib/cn'
import { CATEGORIES, SUBCATEGORIES, type Product } from '@anybuy/types'
import { formatPrice } from '@anybuy/utils'
import { Heart, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ProductCardProps {
  product: Product
  className?: string
  onWishlist?: (id: string) => void
  isWishlisted?: boolean
}

export function ProductCard({ product, className, onWishlist, isWishlisted }: ProductCardProps) {
  const hasVideo = product.media.some(m => m.type === 'video')

  const isNew = product.created_at
    ? Date.now() - new Date(product.created_at).getTime() < 24 * 60 * 60 * 1000
    : false

  const hasDiscount = !!(product.original_price && product.original_price > product.price)
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.original_price!) * 100)
    : 0

  const categoryName = CATEGORIES.find(c => c.slug === product.category)?.name ?? product.category
  const subcategoryName = product.subcategory
    ? SUBCATEGORIES[product.category]?.find(s => s.value === product.subcategory)?.label
    : undefined

  return (
    <Link href={`/products/${product.id}`} className={cn('group flex h-full', className)}>
      <div className="flex flex-col w-full bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">

        {/* ── Image ── */}
        <div className="relative aspect-square flex-shrink-0 overflow-hidden bg-neutral-50">
          <Image
            src={product.thumbnail_url || '/placeholder-product.svg'}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* ── Top-left badge stack ── */}
          {/* Try-On — always first if enabled */}
          {product.virtual_tryon_enabled && (
            <div
              className="absolute top-2 left-2 flex items-center gap-1 z-10 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide text-white"
              style={{ background: 'rgba(255,106,61,0.92)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
              </svg>
              Try On
            </div>
          )}

          {/* NEW / NEGO — offset down when Try On badge is also present */}
          {!hasDiscount && isNew && (
            <div
              className={cn(
                'absolute left-2 text-white text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase z-10 backdrop-blur-sm',
                product.virtual_tryon_enabled ? 'top-9' : 'top-2'
              )}
              style={{ background: 'rgba(14,42,43,0.24)' }}
            >
              NEW
            </div>
          )}
          {!hasDiscount && !isNew && product.is_negotiable && (
            <div
              className={cn(
                'absolute left-2 text-white text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase z-10 backdrop-blur-sm',
                product.virtual_tryon_enabled ? 'top-9' : 'top-2'
              )}
              style={{ background: 'rgba(14,42,43,0.24)' }}
            >
              NEGO
            </div>
          )}

          {/* Discount badge — bottom-left */}
          {hasDiscount && (
            <div className="absolute bottom-2 left-2 z-10 bg-brand-dark text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
              -{discountPct}%
            </div>
          )}

          {/* Video indicator — bottom-left, shift right if discount present */}
          {hasVideo && (
            <div className={cn(
              'absolute bottom-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10',
              hasDiscount ? 'left-16' : 'left-2'
            )}>
              <Play size={10} fill="white" />
              Video
            </div>
          )}

          {/* Verified — bottom-right */}
          {product.seller?.is_verified && (
            <div
              className="absolute bottom-2 right-2 text-brand-green text-[9px] font-bold px-2.5 py-1 rounded-full z-10 backdrop-blur-sm flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.85)' }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M6 0L7.39 4.26L12 4.9L8.7 7.88L9.77 12L6 9.67L2.23 12L3.3 7.88L0 4.9L4.61 4.26L6 0Z" fill="currentColor" />
              </svg>
              Verified
            </div>
          )}

          {/* Wishlist — bare heart, no pill background */}
          {onWishlist && (
            <button
              onClick={e => { e.stopPropagation(); onWishlist(product.id) }}
              className="absolute top-2 right-2 p-1 z-10 hover:scale-110 transition-transform"
            >
              <Heart
                size={18}
                strokeWidth={1.8}
                className={cn(
                  'transition-colors drop-shadow-sm',
                  isWishlisted ? 'fill-red-500 text-red-500' : 'fill-white/60 text-white'
                )}
              />
            </button>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3">

          {/* Price row — above the title, Adidas-style */}
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-base font-bold text-neutral-900 font-satoshi leading-none">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through leading-none">
                {formatPrice(product.original_price!)}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-[13px] font-semibold text-neutral-900 line-clamp-2 leading-snug tracking-tight">
            {product.title}
          </p>

          <div className="flex-1" />

          {/* Category meta + seller */}
          <div className="mt-1.5 space-y-0.5">
            <p className="text-[11px] text-neutral-400 truncate">
              {subcategoryName
                ? <><span className="text-neutral-500 font-medium">{categoryName.split(' ')[0]}</span>{' '}{subcategoryName}</>
                : categoryName
              }
            </p>
            {product.seller && (
              <p className="text-[10px] text-neutral-300 truncate">{product.seller.full_name}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square flex-shrink-0 bg-neutral-100" />
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3 gap-2">
        <div className="h-4 bg-neutral-100 rounded w-20" />
        <div className="h-4 bg-neutral-100 rounded w-3/4" />
        <div className="h-3 bg-neutral-100 rounded w-1/2 mt-1" />
        <div className="h-3 bg-neutral-100 rounded w-1/3" />
      </div>
    </div>
  )
}
