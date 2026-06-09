import { ProductCard, ProductCardSkeleton } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

export async function ProductGrid() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select(`
      id, seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at,
      seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
    `)
    .eq('is_available', true)
    .order('created_at', { ascending: false })
    .limit(9)

  const hasMore = (data ?? []).length > 8
  const products = (data ?? []).slice(0, 8).map(p => ({
    ...p,
    media: [],
    seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
  }))

  if (products.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-satoshi text-2xl font-bold text-neutral-900">Recommended for you</h2>
            <p className="text-neutral-600 text-sm mt-0.5">Quality items, verified sellers</p>
          </div>
        </div>
        <div className="text-center py-16 text-neutral-400 text-sm">
          No listings yet — be the first to sell something!
        </div>
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-satoshi text-2xl font-bold text-neutral-900">Recommended for you</h2>
          <p className="text-neutral-600 text-sm mt-0.5">Quality items, verified sellers</p>
        </div>
        {hasMore && (
          <a href="/search" className="text-brand-orange text-sm font-semibold hover:underline">
            View all →
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product as any} />
        ))}
      </div>
    </section>
  )
}

export function ProductGridSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-satoshi text-2xl font-bold text-neutral-900">Recommended for you</h2>
          <p className="text-neutral-600 text-sm mt-0.5">Quality items, verified sellers</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}
