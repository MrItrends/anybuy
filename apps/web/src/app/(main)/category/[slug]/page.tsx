import { ProductCard } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES, SUBCATEGORIES, type CategorySlug } from '@anybuy/types'
import { ChevronRight, Home, LayoutGrid, Package } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  return CATEGORIES.map(c => ({ slug: c.slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sub?: string }>
}

// Subcategory cover images
const SUBCATEGORY_IMAGES: Record<string, Record<string, string>> = {
  phones: {
    smartphones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=360&fit=crop',
    tablets:     'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=360&fit=crop',
    accessories: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&h=360&fit=crop',
  },
  electronics: {
    laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=360&fit=crop',
    tvs:     'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=360&fit=crop',
    audio:   'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=360&fit=crop',
    cameras: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&h=360&fit=crop',
  },
  fashion: {
    men:     'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&h=360&fit=crop',
    women:   'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&h=360&fit=crop',
    shoes:   'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=360&fit=crop',
    bags:    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&h=360&fit=crop',
    watches: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=360&fit=crop',
  },
  home: {
    furniture:  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=360&fit=crop',
    kitchen:    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&h=360&fit=crop',
    decor:      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=500&h=360&fit=crop',
    appliances: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500&h=360&fit=crop',
  },
  beauty: {
    skincare:  'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=360&fit=crop',
    hair:      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=360&fit=crop',
    fragrance: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=500&h=360&fit=crop',
  },
  sports: {
    equipment: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&h=360&fit=crop',
    apparel:   'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=500&h=360&fit=crop',
    outdoor:   'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&h=360&fit=crop',
  },
  gaming: {
    consoles:    'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&h=360&fit=crop',
    games:       'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&h=360&fit=crop',
    accessories: 'https://images.unsplash.com/photo-1593640408182-31c228426e44?w=500&h=360&fit=crop',
  },
  kids: {
    toys:       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=360&fit=crop',
    clothing:   'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=500&h=360&fit=crop',
    'baby-gear':'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=500&h=360&fit=crop',
  },
  automotive: {
    'car-accessories': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&h=360&fit=crop',
    parts:             'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=500&h=360&fit=crop',
  },
  books: {
    books:  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500&h=360&fit=crop',
    music:  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=360&fit=crop',
    movies: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&h=360&fit=crop',
  },
  office: {
    'office-tools': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&h=360&fit=crop',
    supplies:       'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=500&h=360&fit=crop',
  },
  other: {
    other: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=360&fit=crop',
  },
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { sub } = await searchParams

  const category = CATEGORIES.find(c => c.slug === slug)
  if (!category) notFound()

  const subcategories = SUBCATEGORIES[slug as CategorySlug] ?? []
  const activeSub = subcategories.find(s => s.value === sub)

  // Only fetch products when a subcategory is selected (or category has no subs)
  let products: any[] = []
  if (sub || subcategories.length === 0) {
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
      .eq('category', slug)
      .order('created_at', { ascending: false })

    if (sub) query = query.eq('subcategory', sub)

    const { data } = await query.limit(48)
    products = (data ?? []).map(p => ({
      ...p,
      media: [],
      seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
    }))
  }

  const subImages = SUBCATEGORY_IMAGES[slug] ?? {}
  const showSubcategories = !sub && subcategories.length > 0

  return (
    <div className="min-h-screen bg-brand-off-white">

      {/* Sticky breadcrumb + header */}
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-1.5 text-sm text-neutral-500 flex-wrap">
            <Link href="/" className="flex items-center gap-1 hover:text-brand-orange transition-colors font-medium">
              <Home size={13} />
              Home
            </Link>
            <ChevronRight size={13} className="text-neutral-300 flex-shrink-0" />
            <Link href="/categories" className="hover:text-brand-orange transition-colors font-medium">
              Categories
            </Link>
            <ChevronRight size={13} className="text-neutral-300 flex-shrink-0" />
            {activeSub ? (
              <>
                <Link
                  href={`/category/${slug}`}
                  className="hover:text-brand-orange transition-colors font-medium"
                >
                  {category.name}
                </Link>
                <ChevronRight size={13} className="text-neutral-300 flex-shrink-0" />
                <span className="text-neutral-900 font-semibold">{activeSub.label}</span>
              </>
            ) : (
              <span className="text-neutral-900 font-semibold">{category.name}</span>
            )}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 rounded-full bg-brand-orange" />
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-brand-orange">
              {category.name}
            </p>
          </div>
          <h1 className="font-satoshi text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            {activeSub ? activeSub.label : 'Choose a subcategory'}
          </h1>
          {activeSub && (
            <p className="text-neutral-500 text-sm mt-1">
              {products.length} listing{products.length !== 1 ? 's' : ''} available
            </p>
          )}
        </div>

        {/* ── Subcategory cards (shown when no sub selected) ── */}
        {showSubcategories && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subcategories.map((s) => {
              const imgSrc = subImages[s.value] ?? `https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=500&h=360&fit=crop`
              return (
                <Link
                  key={s.value}
                  href={`/category/${slug}?sub=${s.value}`}
                  className="group relative rounded-2xl overflow-hidden bg-neutral-100 aspect-[4/3] block"
                >
                  <Image
                    src={imgSrc}
                    alt={s.label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                  {/* Accent bar */}
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-orange" />

                  {/* Label */}
                  <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                    <p className="text-white font-satoshi font-bold text-sm leading-tight">{s.label}</p>
                    <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                      <ChevronRight size={14} className="text-white" />
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* "All in [category]" shortcut card */}
            <Link
              href={`/search?category=${slug}`}
              className="group relative rounded-2xl overflow-hidden bg-neutral-900 aspect-[4/3] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-700 hover:border-brand-orange transition-colors"
            >
              <LayoutGrid size={28} className="text-neutral-400 group-hover:text-brand-orange transition-colors" />
              <div className="text-center">
                <p className="text-white font-semibold text-sm">All in {category.name}</p>
                <p className="text-neutral-400 text-xs mt-0.5">Browse everything</p>
              </div>
            </Link>
          </div>
        )}

        {/* ── Products grid (shown when sub selected or no subs) ── */}
        {!showSubcategories && (
          <>
            {/* Sub-filter pills */}
            {subcategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
                <Link
                  href={`/category/${slug}`}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                >
                  ← All subcategories
                </Link>
                {subcategories.map(s => (
                  <Link
                    key={s.value}
                    href={`/category/${slug}?sub=${s.value}`}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${sub === s.value
                        ? 'bg-brand-dark text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}

            {products.length === 0 ? (
              <div className="text-center py-24">
                <Package size={48} className="text-neutral-200 mx-auto mb-4" />
                <h3 className="font-satoshi text-xl font-bold text-neutral-900 mb-2">Nothing here yet</h3>
                <p className="text-neutral-400 text-sm mb-6 max-w-xs mx-auto">
                  No listings in this subcategory right now. Try a different one or browse the full category.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link
                    href={`/category/${slug}`}
                    className="text-sm font-medium text-white bg-brand-orange hover:bg-[#e85a2d] px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Browse {category.name}
                  </Link>
                  <Link
                    href="/search"
                    className="text-sm font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-white px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Search all items
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map(p => (
                  <ProductCard key={p.id} product={p as any} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
