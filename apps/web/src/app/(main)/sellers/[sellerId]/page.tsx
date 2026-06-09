import { ProductCard } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@anybuy/utils'
import { BadgeCheck, Calendar, Package, Star, UserCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { BackButton } from './BackButton'
import { FollowButton } from './FollowButton'

interface PageProps {
  params: Promise<{ sellerId: string }>
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-white/20 text-white/20'}
        />
      ))}
    </div>
  )
}

export default async function SellerStorePage({ params }: PageProps) {
  const { sellerId } = await params
  const supabase = await createClient()

  // ── Core profile ──────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, rating, rating_count, is_verified, created_at')
    .eq('id', sellerId)
    .maybeSingle()

  if (!profile) notFound()

  // ── Seller profile (store meta) ────────────────────────────────────────────
  const { data: sp } = await supabase
    .from('seller_profiles')
    .select('store_name, store_description, total_sales, verified_seller, response_rate')
    .eq('user_id', sellerId)
    .maybeSingle()

  // ── Active listings ────────────────────────────────────────────────────────
  const { data: productsData } = await supabase
    .from('products')
    .select(`
      id, seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at,
      seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
    `)
    .eq('seller_id', sellerId)
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  const products = (productsData ?? []).map(p => ({
    ...p,
    media: [],
    seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
  }))

  // ── Seller reviews ─────────────────────────────────────────────────────────
  // Requires the "Reviews are publicly readable" RLS policy (migration 003).
  // Returns empty array gracefully if the policy hasn't been applied yet.
  const { data: reviewsData } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, buyer:profiles!buyer_id(full_name)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(12)

  const reviews = (reviewsData ?? []).map((r: any) => ({
    ...r,
    buyer: Array.isArray(r.buyer) ? r.buyer[0] : r.buyer,
  }))

  const storeName    = sp?.store_name ?? profile.full_name
  const rating       = profile.rating ?? 0
  const ratingCount  = profile.rating_count ?? 0
  const totalSales   = sp?.total_sales ?? 0
  const responseRate = sp?.response_rate ?? 0

  return (
    <div className="min-h-screen bg-neutral-50">

      {/* ── Store header ───────────────────────────────────────────────────── */}
      <div className="bg-brand-dark">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
          <BackButton />
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">

            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-orange font-bold text-3xl font-satoshi">
                {storeName[0]?.toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              {/* Name + verified + follow */}
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="font-satoshi text-2xl font-bold text-white">{storeName}</h1>
                {(sp?.verified_seller || profile.is_verified) && (
                  <BadgeCheck size={20} className="text-brand-green" />
                )}
                {/* Follow button — client component, needs auth */}
                <div className="sm:ml-auto">
                  <FollowButton sellerId={sellerId} />
                </div>
              </div>

              {/* AnyBuy seller score */}
              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={rating} size={15} />
                {ratingCount > 0 ? (
                  <span className="text-white/70 text-sm">
                    {rating.toFixed(1)} · {ratingCount} review{ratingCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-white/40 text-sm">No reviews yet</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-white/60 text-sm">
                  <Package size={14} />
                  <span>{products.length} listing{products.length !== 1 ? 's' : ''}</span>
                </div>
                {totalSales > 0 && (
                  <div className="text-white/60 text-sm">
                    <span>{totalSales} sales</span>
                  </div>
                )}
                {responseRate > 0 && (
                  <div className="text-white/60 text-sm">
                    <span>{responseRate}% response rate</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-white/60 text-sm">
                  <Calendar size={14} />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>
              </div>

              {/* Store description */}
              {sp?.store_description && (
                <p className="text-white/60 text-sm mt-4 max-w-2xl leading-relaxed border-t border-white/10 pt-4">
                  {sp.store_description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* ── Listings ────────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-satoshi text-xl font-bold text-neutral-900 mb-5">
            {products.length > 0
              ? `All listings by ${storeName}`
              : `${storeName} has no listings yet`}
          </h2>

          {products.length === 0 ? (
            <div className="text-center py-20 text-neutral-400">
              <Package size={40} className="mx-auto mb-3 opacity-30" />
              <p>No active listings at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
          )}
        </section>

        {/* ── Customer Reviews ────────────────────────────────────────────── */}
        <section className="border-t border-neutral-200 pt-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-satoshi text-xl font-bold text-neutral-900">
                Customer Reviews
              </h2>
              <p className="text-sm text-neutral-500 mt-0.5">
                Verified reviews from completed AnyBuy transactions
              </p>
            </div>

            {/* Aggregate score card */}
            {ratingCount > 0 && (
              <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-2xl px-5 py-4 text-center flex-shrink-0 ml-6">
                <span className="font-satoshi text-4xl font-bold text-neutral-900">
                  {rating.toFixed(1)}
                </span>
                <div className="flex items-center gap-0.5 my-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n}
                      size={16}
                      className={n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}
                    />
                  ))}
                </div>
                <span className="text-xs text-neutral-500">
                  {ratingCount} review{ratingCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map(review => (
                <div key={review.id} className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col gap-3">
                  {/* Reviewer info */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle size={18} className="text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {review.buyer?.full_name ?? 'Anonymous'}
                      </p>
                      <p className="text-xs text-neutral-400">{formatDate(review.created_at)}</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={13}
                        className={n <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm text-neutral-600 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-neutral-200 rounded-2xl">
              <div className="flex items-center justify-center gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} size={24} className="text-neutral-200" />
                ))}
              </div>
              <p className="text-neutral-500 font-medium">No reviews yet</p>
              <p className="text-sm text-neutral-400 mt-1">
                Reviews appear here after completed transactions.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
