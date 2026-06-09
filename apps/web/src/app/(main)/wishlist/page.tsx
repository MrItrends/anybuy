'use client'

import { ProductCard } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import type { Product } from '@anybuy/types'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function WishlistPage() {
  const { user } = useAuthStore()
  const router   = useRouter()
  const [items, setItems]   = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/'); return }

    createClient()
      .from('wishlists')
      .select(`
        product:products(
          id, seller_id, title, price, original_price, category, subcategory,
          condition, thumbnail_url, is_negotiable, is_available,
          view_count, created_at, updated_at, virtual_tryon_enabled,
          seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const products = (data ?? [])
          .map((row: any) => Array.isArray(row.product) ? row.product[0] : row.product)
          .filter(Boolean)
          .map((p: any) => ({ ...p, media: [], seller: Array.isArray(p.seller) ? p.seller[0] : p.seller }))
        setItems(products)
        setLoading(false)
      })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function removeFromWishlist(productId: string) {
    if (!user) return
    setItems(prev => prev.filter(p => p.id !== productId))
    await createClient()
      .from('wishlists')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Heart size={22} className="fill-red-500 text-red-500" />
        <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Saved Items</h1>
        {!loading && items.length > 0 && (
          <span className="text-sm text-neutral-400">({items.length})</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 bg-neutral-50 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Heart size={24} className="text-neutral-300" />
          </div>
          <p className="font-semibold text-neutral-700">No saved items yet</p>
          <p className="text-sm text-neutral-400 mt-1">Tap the heart on any listing to save it here</p>
          <Link href="/" className="mt-5 inline-block text-sm text-brand-orange font-semibold hover:underline">
            Browse listings →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted
              onWishlist={() => removeFromWishlist(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
