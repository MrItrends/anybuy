'use client'

import { Button, ConditionBadge, ProductCard, VerifiedBadge } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { trackProductView } from '@/hooks/useUserActivity'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { CATEGORIES, SUBCATEGORIES, type Product, type ProductVariant } from '@anybuy/types'
import { formatDate, formatPrice } from '@anybuy/utils'
import {
  ArrowRight, ChevronDown, ChevronLeft, ChevronRight,
  Heart, MapPin, MessageCircle, Minus, Play, Plus,
  ShieldCheck, Star, Tag, Truck, UserCircle,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChatPopup } from './ChatPopup'
import { VirtualTryOn } from './VirtualTryOn'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  buyer: { full_name: string } | null
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={size}
          className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'} />
      ))}
    </div>
  )
}

function Accordion({ label, children, defaultOpen = false }: { label: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-neutral-100">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="font-satoshi font-semibold text-neutral-900">{label}</span>
        <ChevronDown size={18} className={`text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 animate-pulse">
      <div className="h-4 w-44 bg-neutral-200 rounded mb-8" />
      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <div className="grid grid-cols-2 gap-0.5">
          {[0,1,2,3].map(i => <div key={i} className="aspect-square bg-neutral-200" />)}
        </div>
        <div className="flex flex-col gap-4">
          {[24,56,40,8,32,32,48,48].map((h, i) => (
            <div key={i} style={{ height: h }} className="bg-neutral-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductDetailClient({ id }: { id: string }) {
  const [product, setProduct]           = useState<Product | null>(null)
  const [loading, setLoading]           = useState(true)
  const [showAllMedia, setShowAllMedia] = useState(false)
  const [lightbox, setLightbox]         = useState<number | null>(null)
  const [wishlisted, setWishlisted]     = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [reviews, setReviews]           = useState<Review[]>([])
  const [related, setRelated]           = useState<Product[]>([])
  const [chatOpen, setChatOpen]         = useState(false)
  const [tryonOpen, setTryonOpen]       = useState(false)
  const [variants, setVariants]         = useState<ProductVariant[]>([])
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize]   = useState<string | null>(null)
  const [offeredPrice, setOfferedPrice]   = useState<number | null>(null)

  const { requireAuth, user } = useAuthStore()
  const addItem = useCartStore(s => s.addItem)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, seller_id, title, description, price, original_price, category, subcategory,
          condition, thumbnail_url, location, is_negotiable, is_available,
          view_count, created_at, updated_at, virtual_tryon_enabled, tryon_image_url,
          seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified),
          media:product_media(id, url, type, order)
        `)
        .eq('id', id)
        .single()

      if (error || !data) { setLoading(false); return }

      const sorted = ((data.media ?? []) as any[]).sort((a, b) => a.order - b.order)
      const mapped: Product = {
        ...data,
        media: sorted,
        seller: Array.isArray(data.seller) ? data.seller[0] : data.seller,
      } as Product

      setProduct(mapped)
      setOfferedPrice(data.price)
      setLoading(false)

      // negotiation_floor
      supabase.from('products').select('negotiation_floor').eq('id', id).single()
        .then(({ data: nf }) => {
          if (nf?.negotiation_floor != null)
            setProduct(prev => prev ? { ...prev, negotiation_floor: nf.negotiation_floor } : prev)
        })

      // variants
      supabase.from('product_variants').select('*').eq('product_id', id)
        .then(({ data: vdata }) => {
          if (vdata?.length) {
            setVariants(vdata)
            setSelectedColor(vdata.find(v => v.color_name)?.color_name ?? null)
            setSelectedSize(vdata.find(v => v.size_label)?.size_label ?? null)
          }
        })

      // reviews
      supabase.from('reviews')
        .select('id, rating, comment, created_at, buyer:profiles!buyer_id(full_name)')
        .eq('seller_id', data.seller_id).order('created_at', { ascending: false }).limit(6)
        .then(({ data: rv }) => {
          if (rv) setReviews(rv.map((r: any) => ({ ...r, buyer: Array.isArray(r.buyer) ? r.buyer[0] : r.buyer })))
        })

      // related products — same category, different product
      supabase.from('products')
        .select('id, seller_id, title, price, original_price, category, subcategory, condition, thumbnail_url, is_negotiable, is_available, view_count, created_at, updated_at, virtual_tryon_enabled, seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)')
        .eq('category', data.category)
        .eq('is_available', true)
        .neq('id', id)
        .order('view_count', { ascending: false })
        .limit(8)
        .then(({ data: rel }) => {
          if (rel) setRelated(rel.map((p: any) => ({ ...p, media: [], seller: Array.isArray(p.seller) ? p.seller[0] : p.seller })))
        })

      // Check if wishlisted
      const authUser = useAuthStore.getState().user
      if (authUser) {
        supabase.from('wishlists').select('product_id').eq('user_id', authUser.id).eq('product_id', id).maybeSingle()
          .then(({ data: wl }) => { if (wl) setWishlisted(true) })
      }

      trackProductView(data.id, data.category)
      supabase.from('products').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', id)
    }

    load()
  }, [id])

  const effectivePrice   = offeredPrice ?? product?.price ?? 0
  const isNegotiating    = product?.is_negotiable && product?.negotiation_floor != null
  const hasNegDiscount   = isNegotiating && effectivePrice < (product?.price ?? 0)
  const hasOrigDiscount  = !!(product?.original_price && product.original_price > product.price)
  const discountPct      = hasOrigDiscount ? Math.round((1 - product!.price / product!.original_price!) * 100) : 0
  const displayPrice     = hasNegDiscount ? effectivePrice : product?.price ?? 0

  async function handleWishlist() {
    const authUser = useAuthStore.getState().user
    if (!authUser) { useAuthStore.getState().openLoginModal(); return }
    if (wishlistLoading) return
    setWishlistLoading(true)
    const supabase = createClient()
    if (wishlisted) {
      await supabase.from('wishlists').delete().eq('user_id', authUser.id).eq('product_id', id)
      setWishlisted(false)
      toast('Removed from saved items')
    } else {
      await supabase.from('wishlists').upsert({ user_id: authUser.id, product_id: id })
      setWishlisted(true)
      toast.success('Saved to wishlist')
    }
    setWishlistLoading(false)
  }

  function handleAddToCart() {
    if (!product) return
    addItem(product, hasNegDiscount ? effectivePrice : undefined)
    toast.success('Added to cart')
  }
  function handleBuyNow() {
    if (!requireAuth('purchase')) return
    if (!product) return
    addItem(product, hasNegDiscount ? effectivePrice : undefined)
    router.push('/checkout')
  }

  if (loading) return <ProductDetailSkeleton />
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-400">Product not found.</p>
        <Link href="/" className="text-brand-orange hover:underline text-sm mt-3 inline-block">Back to listings</Link>
      </div>
    )
  }

  const isSeller = !!user && user.id === product.seller_id

  const categoryName    = CATEGORIES.find(c => c.slug === product.category)?.name ?? product.category
  const subcategoryName = product.subcategory ? SUBCATEGORIES[product.category]?.find(s => s.value === product.subcategory)?.label : undefined
  const sellerRating      = product.seller?.rating ?? 0
  const sellerReviewCount = product.seller?.rating_count ?? 0
  const uniqueColors = [...new Map(variants.filter(v => v.color_name).map(v => [v.color_name, v])).values()]
  const uniqueSizes  = [...new Map(variants.filter(v => v.size_label).map(v => [v.size_label, v])).values()]
  const sysLabel     = uniqueSizes[0]?.size_system
    ? ({ uk: 'UK', us: 'US', shoe_uk: 'UK Shoe', shoe_us: 'US Shoe', generic: '' } as Record<string, string>)[uniqueSizes[0].size_system] ?? ''
    : ''
  const selectedStock = selectedColor && selectedSize
    ? variants.find(v => v.size_label === selectedSize && v.color_name === selectedColor)?.quantity ?? null
    : null

  // Images to show: first 4 collapsed, all expanded
  const allMedia   = product.media.length > 0 ? product.media : [{ id: 'thumb', url: product.thumbnail_url ?? '/placeholder-product.svg', type: 'image' as const, order: 0 }]
  const shownMedia = showAllMedia ? allMedia : allMedia.slice(0, 4)

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-16">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-6 flex-wrap">
          <Link href="/" className="hover:text-neutral-700 transition-colors">Home</Link>
          <ChevronRight size={11} />
          <Link href={`/category/${product.category}`} className="hover:text-neutral-700 transition-colors">{categoryName}</Link>
          {subcategoryName && (<><ChevronRight size={11} /><Link href={`/category/${product.category}?sub=${product.subcategory}`} className="hover:text-neutral-700 transition-colors">{subcategoryName}</Link></>)}
          <ChevronRight size={11} />
          <span className="text-neutral-500 truncate max-w-[180px]">{product.title}</span>
        </nav>

        {/*
          ── Layout strategy ──
          Mobile:  images → info panel → accordions  (source order)
          Desktop: [images      | info panel (sticky)]
                   [accordions  |                    ]
          Achieved via lg:grid with explicit col/row placement.
        */}
        <div className="lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] lg:gap-8 xl:gap-12 lg:items-start">

          {/* ── 1. Image mosaic (col 1 row 1 on desktop) ── */}
          <div className="lg:col-start-1 lg:row-start-1">
            <div className={`grid gap-0.5 ${shownMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {shownMedia.map((m, i) => (
                <button
                  key={m.id ?? i}
                  onClick={() => setLightbox(i)}
                  className="relative aspect-square bg-neutral-100 overflow-hidden group block"
                >
                  {m.type === 'video' ? (
                    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-brand-orange flex items-center justify-center">
                        <Play size={20} fill="white" />
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={m.url}
                      alt={`${product.title} – image ${i + 1}`}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      priority={i < 2}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Show more / less */}
            {allMedia.length > 4 && (
              <button
                onClick={() => setShowAllMedia(s => !s)}
                className="w-full mt-0.5 h-11 bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm font-semibold text-neutral-700 flex items-center justify-center gap-2"
              >
                {showAllMedia ? 'SHOW LESS' : 'SHOW MORE'}
                <ChevronDown size={15} className={`transition-transform ${showAllMedia ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* ── 2. Info panel (col 2 row 1 sticky on desktop, between images & accordions on mobile) ── */}
          <div className="mt-6 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6">

            {/* Category */}
            <p className="text-xs text-neutral-500 font-medium mb-2">
              {subcategoryName ? `${categoryName} • ${subcategoryName}` : categoryName}
            </p>

            {/* Title */}
            <h1 className="font-satoshi text-xl sm:text-2xl font-black text-neutral-900 leading-tight tracking-tight uppercase mb-3">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2 flex-wrap mb-1">
              <span className="font-satoshi text-xl font-bold text-neutral-900">
                {formatPrice(displayPrice)}
              </span>
              {(hasOrigDiscount || hasNegDiscount) && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatPrice(hasNegDiscount ? product.price : product.original_price!)}
                </span>
              )}
              {hasOrigDiscount && (
                <span className="text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                  -{discountPct}%
                </span>
              )}
            </div>
            {hasNegDiscount && (
              <p className="text-xs text-brand-green font-semibold mb-3">
                ✓ Save {formatPrice(product.price - effectivePrice)} with your offer
              </p>
            )}

            {/* Rating */}
            {sellerReviewCount > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                <StarRating rating={sellerRating} size={13} />
                <span className="text-xs text-neutral-500">{sellerRating.toFixed(1)} ({sellerReviewCount})</span>
              </div>
            )}

            <div className="h-px bg-neutral-100 my-4" />

            {/* ── Color selector ── */}
            {uniqueColors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  {uniqueColors.length} Colour{uniqueColors.length !== 1 ? 's' : ''} available
                </p>
                <div className="flex flex-wrap gap-2 mb-1">
                  {uniqueColors.map(v => {
                    const oos = variants.filter(x => x.color_name === v.color_name && (!selectedSize || x.size_label === selectedSize)).every(x => x.quantity === 0)
                    return (
                      <button key={v.color_name} type="button" title={v.color_name!}
                        onClick={() => setSelectedColor(v.color_name!)} disabled={oos}
                        className={`w-8 h-8 rounded-full border-2 transition-all relative ${selectedColor === v.color_name ? 'border-brand-orange scale-110 shadow' : 'border-transparent hover:scale-105'} ${oos ? 'opacity-30' : ''}`}
                        style={{ backgroundColor: v.color_hex ?? '#ccc' }}>
                        {v.color_hex === '#FFFFFF' && <span className="absolute inset-0 rounded-full border border-neutral-300" />}
                      </button>
                    )
                  })}
                </div>
                {selectedColor && <p className="text-xs text-neutral-500">{selectedColor}</p>}
              </div>
            )}

            {/* ── Size selector ── */}
            {uniqueSizes.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    Sizes{sysLabel ? ` (${sysLabel})` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueSizes.map(v => {
                    const oos = variants.filter(x => x.size_label === v.size_label && (!selectedColor || x.color_name === selectedColor)).every(x => x.quantity === 0)
                    return (
                      <button key={v.size_label} type="button" onClick={() => setSelectedSize(v.size_label!)} disabled={oos}
                        className={`min-w-[44px] h-9 px-2.5 rounded-lg border text-sm font-medium transition-all ${
                          selectedSize === v.size_label ? 'bg-brand-dark border-brand-dark text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400'
                        } ${oos ? 'opacity-30 line-through cursor-not-allowed' : ''}`}>
                        {v.size_label}
                      </button>
                    )
                  })}
                </div>
                {selectedStock !== null && (
                  <p className={`text-xs mt-2 font-medium ${selectedStock === 0 ? 'text-red-500' : selectedStock <= 3 ? 'text-amber-600' : 'text-brand-green'}`}>
                    {selectedStock === 0 ? 'Out of stock' : selectedStock <= 3 ? `Only ${selectedStock} left` : `In stock`}
                  </p>
                )}
              </div>
            )}

            {/* ── Negotiation panel ── */}
            {!isSeller && isNegotiating && product.negotiation_floor != null && offeredPrice !== null && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-brand-orange flex-shrink-0" />
                  <p className="text-sm font-semibold text-neutral-900">Name your price</p>
                  <span className="ml-auto text-xs text-neutral-400">Min {formatPrice(product.negotiation_floor)}</span>
                </div>
                <input type="range" min={product.negotiation_floor} max={product.price}
                  step={Math.max(100, Math.round((product.price - product.negotiation_floor) / 100) * 10)}
                  value={offeredPrice} onChange={e => setOfferedPrice(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-brand-orange"
                  style={{ background: `linear-gradient(to right, #FF6A3D ${((offeredPrice - product.negotiation_floor) / (product.price - product.negotiation_floor)) * 100}%, #e5e7eb ${((offeredPrice - product.negotiation_floor) / (product.price - product.negotiation_floor)) * 100}%)` }}
                />
                <div className="flex items-center gap-2">
                  <button onClick={() => setOfferedPrice(p => Math.max(product.negotiation_floor!, (p ?? product.price) - Math.max(100, Math.round((product.price - product.negotiation_floor!) / 100) * 10)))}
                    className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-100"><Minus size={13} /></button>
                  <div className="flex-1 text-center">
                    <span className="font-satoshi text-lg font-bold text-neutral-900">{formatPrice(offeredPrice)}</span>
                    {offeredPrice < product.price && <p className="text-[10px] text-brand-green">✓ Auto-accepted</p>}
                  </div>
                  <button onClick={() => setOfferedPrice(p => Math.min(product.price, (p ?? product.price) + Math.max(100, Math.round((product.price - product.negotiation_floor!) / 100) * 10)))}
                    className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-100"><Plus size={13} /></button>
                </div>
              </div>
            )}

            {/* ── Virtual Try-On ── */}
            {!isSeller && product.virtual_tryon_enabled && product.tryon_image_url && (
              <button type="button" onClick={() => setTryonOpen(true)}
                className="w-full flex items-center justify-center gap-2 h-10 border border-dashed border-brand-orange/60 text-brand-orange rounded-xl text-sm font-semibold hover:bg-brand-orange/5 hover:border-brand-orange transition-all mb-3">
                <span>👕</span> Try this on virtually
              </button>
            )}

            {/* ── CTAs — hidden for the seller ── */}
            {isSeller ? (
              <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-4">
                <span className="text-xs text-neutral-500 font-medium">This is your listing</span>
                <Link href="/seller/dashboard" className="ml-auto text-xs font-bold text-brand-orange hover:underline">
                  Manage →
                </Link>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm flex items-center justify-center gap-2 rounded-xl transition-colors"
                  >
                    ADD TO BAG <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={handleWishlist}
                    disabled={wishlistLoading}
                    className="w-12 h-12 rounded-xl border border-neutral-200 flex items-center justify-center hover:border-red-300 transition-colors flex-shrink-0"
                  >
                    <Heart size={18} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-neutral-500'} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="w-full h-12 border border-neutral-300 hover:border-neutral-500 text-neutral-800 font-bold text-sm flex items-center justify-center gap-2 rounded-xl transition-colors mb-4"
                >
                  ADD TO CART <ArrowRight size={16} />
                </button>
              </>
            )}

            {/* Trust row */}
            <div className="flex items-center justify-center gap-4 py-3 border-y border-neutral-100 mb-4">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <ShieldCheck size={14} className="text-brand-green" /> Escrow Protected
              </span>
              <span className="w-px h-3 bg-neutral-200" />
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <Truck size={14} className="text-brand-orange" /> Tracked Delivery
              </span>
            </div>

            {/* ── Seller card ── */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <button type="button" onClick={() => router.push(`/sellers/${product.seller_id}`)}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-neutral-50 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {product.seller?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{product.seller?.full_name}</p>
                    {product.seller?.is_verified && <VerifiedBadge />}
                  </div>
                  <StarRating rating={sellerRating} size={11} />
                </div>
                <ChevronRight size={14} className="text-neutral-400 flex-shrink-0" />
              </button>
              <div className="border-t border-neutral-100 px-3.5 py-2.5">
                <button type="button" onClick={() => { if (!requireAuth('chat')) return; setChatOpen(true) }}
                  className="w-full flex items-center justify-center gap-2 h-8 text-xs font-semibold text-neutral-600 hover:text-brand-orange transition-colors">
                  <MessageCircle size={13} /> Ask seller a question
                </button>
              </div>
            </div>
          </div>

          {/* ── 3. Accordions (col 1 row 2 on desktop, last on mobile) ── */}
          <div className="mt-6 border-b border-neutral-100 lg:col-start-1 lg:row-start-2">
            <Accordion label="Description" defaultOpen>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </Accordion>

            <Accordion label="Details">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-neutral-400 text-xs uppercase tracking-wide mb-0.5">Condition</dt><dd className="font-medium text-neutral-900"><ConditionBadge condition={product.condition} /></dd></div>
                <div><dt className="text-neutral-400 text-xs uppercase tracking-wide mb-0.5">Location</dt><dd className="font-medium text-neutral-900 flex items-center gap-1"><MapPin size={12} />{product.location ?? '—'}</dd></div>
                <div><dt className="text-neutral-400 text-xs uppercase tracking-wide mb-0.5">Listed</dt><dd className="font-medium text-neutral-900">{formatDate(product.created_at)}</dd></div>
                <div><dt className="text-neutral-400 text-xs uppercase tracking-wide mb-0.5">Views</dt><dd className="font-medium text-neutral-900">{product.view_count?.toLocaleString()}</dd></div>
                {uniqueSizes.length > 0 && <div><dt className="text-neutral-400 text-xs uppercase tracking-wide mb-0.5">Size system</dt><dd className="font-medium text-neutral-900">{sysLabel || 'Generic'}</dd></div>}
              </dl>
            </Accordion>

            <Accordion label="Escrow &amp; Buyer Protection">
              <ol className="space-y-2">
                {['You pay — funds held securely by AnyBuy', 'Seller ships your item', 'You receive and inspect the item', 'You confirm delivery — funds released to seller'].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-neutral-600">
                    <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </Accordion>
          </div>
        </div>

        {/* ── Related products ── */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-satoshi text-xl font-black text-neutral-900 uppercase tracking-tight mb-5">
              You May Also Like
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {related.map(p => (
                <div key={p.id} className="flex-shrink-0 w-[calc((100%-48px)/5)] min-w-[140px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Reviews ── */}
        <div className="mt-14 border-t border-neutral-100 pt-10">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div>
              <h2 className="font-satoshi text-xl font-black text-neutral-900 uppercase tracking-tight">Customer Reviews</h2>
              <p className="text-sm text-neutral-400 mt-0.5">Ratings are for this seller across all transactions</p>
            </div>
            {sellerReviewCount > 0 && (
              <div className="flex flex-col items-center bg-neutral-50 rounded-2xl px-6 py-4 text-center">
                <span className="font-satoshi text-4xl font-bold text-neutral-900">{sellerRating.toFixed(1)}</span>
                <StarRating rating={sellerRating} size={16} />
                <span className="text-xs text-neutral-400 mt-1">{sellerReviewCount} review{sellerReviewCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          {reviews.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map(review => (
                <div key={review.id} className="border border-neutral-100 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle size={18} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{review.buyer?.full_name ?? 'Anonymous'}</p>
                      <p className="text-xs text-neutral-400">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} size={13} />
                  {review.comment && <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-2xl">
              <StarRating rating={0} size={24} />
              <p className="mt-3 text-neutral-500 font-medium">No reviews yet</p>
              <p className="text-sm text-neutral-400 mt-1">Be the first to buy from this seller.</p>
            </div>
          )}
          {sellerReviewCount > 6 && (
            <div className="mt-5 text-center">
              <Link href={`/sellers/${product.seller_id}`} className="text-brand-orange text-sm font-semibold hover:underline">
                View all {sellerReviewCount} reviews →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile sticky bar — buyers only ── */}
      {!isSeller && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 flex items-center gap-3 z-40 shadow-lg">
          <div className="flex-1 min-w-0">
            <p className="font-satoshi text-lg font-bold text-neutral-900 leading-none">{formatPrice(displayPrice)}</p>
            {hasOrigDiscount && <p className="text-xs text-neutral-400 line-through">{formatPrice(product.original_price!)}</p>}
          </div>
          <button onClick={handleAddToCart}
            className="h-11 px-4 rounded-xl border border-neutral-300 text-sm font-bold text-neutral-700 hover:border-neutral-500 transition-colors flex-shrink-0">
            Cart
          </button>
          <button onClick={handleBuyNow}
            className="h-11 px-5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-sm font-bold flex items-center gap-1.5 flex-shrink-0">
            Buy Now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl font-light">✕</button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? Math.max(0, l - 1) : 0) }}>
            <ChevronLeft size={20} className="text-white" />
          </button>
          <div className="relative w-full max-w-2xl aspect-square" onClick={e => e.stopPropagation()}>
            <Image src={allMedia[lightbox]?.url ?? ''} alt={product.title} fill className="object-contain" sizes="800px" />
          </div>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); setLightbox(l => l !== null ? Math.min(allMedia.length - 1, l + 1) : 0) }}>
            <ChevronRight size={20} className="text-white" />
          </button>
          <p className="absolute bottom-4 text-white/50 text-sm">{lightbox + 1} / {allMedia.length}</p>
        </div>
      )}

      {chatOpen && <ChatPopup productId={product.id} productTitle={product.title} sellerId={product.seller_id} sellerName={product.seller?.full_name ?? 'Seller'} onClose={() => setChatOpen(false)} />}
      {tryonOpen && product.tryon_image_url && <VirtualTryOn productTitle={product.title} tryonImageUrl={product.tryon_image_url} category={product.category} subcategory={product.subcategory} onClose={() => setTryonOpen(false)} />}
    </div>
  )
}
