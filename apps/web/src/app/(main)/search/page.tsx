import { ProductCard, ProductCardSkeleton } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@anybuy/types'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import { SearchBar } from './SearchBar'

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; min?: string; max?: string }>
}

async function SearchResults({
  q, category, sort, min, max,
}: {
  q: string; category: string; sort: string; min: string; max: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(`
      id, seller_id, title, description, price, category, subcategory,
      condition, thumbnail_url, location, is_negotiable, is_available,
      view_count, created_at, updated_at,
      seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
    `)
    .eq('is_available', true)

  if (q) query = query.ilike('title', `%${q}%`)
  if (category) query = query.eq('category', category)
  if (min) query = query.gte('price', Number(min))
  if (max) query = query.lte('price', Number(max))

  if (sort === 'price_asc') query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const { data } = await query.limit(48)
  const products = (data ?? []).map(p => ({
    ...p,
    media: [],
    seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
  }))

  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <Search size={48} className="text-neutral-200 mx-auto mb-4" />
        <h3 className="font-satoshi text-xl font-bold text-neutral-900 mb-2">No results found</h3>
        <p className="text-neutral-500 text-sm mb-6">
          {q ? `Nothing matched "${q}". Try a broader search.` : 'No listings available yet.'}
        </p>
        <Link href="/" className="text-brand-orange hover:underline text-sm font-medium">
          Browse all listings
        </Link>
      </div>
    )
  }

  return (
    <>
      <p className="text-sm text-neutral-500 mb-5">
        <span className="font-semibold text-neutral-900">{products.length}</span>
        {products.length === 48 ? '+' : ''} result{products.length !== 1 ? 's' : ''}
        {q ? <> for <span className="text-neutral-900">"{q}"</span></> : ''}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => <ProductCard key={p.id} product={p as any} />)}
      </div>
    </>
  )
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', category = '', sort = 'newest', min = '', max = '' } = await searchParams

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Search header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <SearchBar defaultQ={q} defaultSort={sort} defaultCategory={category} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
          <Link
            href={`/search?q=${q}&sort=${sort}`}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${!category ? 'bg-brand-dark text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
          >
            All
          </Link>
          {CATEGORIES.map(c => (
            <Link
              key={c.slug}
              href={`/search?q=${q}&sort=${sort}&category=${c.slug}`}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${category === c.slug ? 'bg-brand-dark text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Results */}
        <Suspense key={`${q}-${category}-${sort}-${min}-${max}`} fallback={
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        }>
          <SearchResults q={q} category={category} sort={sort} min={min} max={max} />
        </Suspense>
      </div>
    </div>
  )
}
