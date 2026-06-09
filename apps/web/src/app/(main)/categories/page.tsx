import { CATEGORIES, SUBCATEGORIES as SUBCATEGORIES_MAP } from '@anybuy/types'
import { ChevronRight, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const CATEGORY_IMAGES: Record<string, { product: string; lifestyle: string }> = {
  phones:      { product: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&h=400&fit=crop' },
  electronics: { product: 'https://images.unsplash.com/photo-1593640408182-31c228426e44?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop' },
  fashion:     { product: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&h=400&fit=crop' },
  home:        { product: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=600&h=400&fit=crop' },
  beauty:      { product: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=400&fit=crop' },
  sports:      { product: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop' },
  gaming:      { product: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop' },
  kids:        { product: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop' },
  automotive:  { product: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&h=400&fit=crop' },
  books:       { product: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&h=400&fit=crop' },
  office:      { product: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
  other:       { product: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop', lifestyle: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=600&h=400&fit=crop' },
}

export const metadata = {
  title: 'Browse Categories',
}

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-brand-off-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-neutral-500">
            <Link href="/" className="flex items-center gap-1 hover:text-brand-orange transition-colors">
              <Home size={13} />
              Home
            </Link>
            <ChevronRight size={13} className="text-neutral-300" />
            <span className="text-neutral-900 font-medium">All Categories</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Heading */}
        <div className="mb-8">
          <p className="text-brand-orange text-xs font-bold tracking-[0.25em] uppercase mb-2">
            Browse
          </p>
          <h1 className="font-satoshi text-3xl font-bold text-neutral-900 tracking-tight">
            All Categories
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {CATEGORIES.length} categories · tap to explore
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const imgs = CATEGORY_IMAGES[cat.slug]
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-neutral-100 aspect-[4/3] block"
              >
                {/* Product image */}
                <Image
                  src={imgs.product}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                {/* Bottom label */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between">
                  <div>
                    <p className="text-white font-satoshi font-bold text-sm leading-tight">
                      {cat.name}
                    </p>
                    <p className="text-white/60 text-xs mt-0.5">
                      {(SUBCATEGORIES_MAP[cat.slug] ?? []).length} subcategories
                    </p>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
                    <ChevronRight size={14} className="text-white" />
                  </div>
                </div>

                {/* Accent top bar */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-brand-orange" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

