'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORIES = [
  {
    name: 'Phones & Tablets',
    slug: 'phones',
    color: '#EFF6FF',
    textColor: '#1D4ED8',
    productImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&h=300&fit=crop&crop=faces',
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    color: '#F0FDF4',
    textColor: '#15803D',
    productImage: 'https://images.unsplash.com/photo-1593640408182-31c228426e44?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    color: '#FDF4FF',
    textColor: '#7E22CE',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=300&fit=crop&crop=faces',
  },
  {
    name: 'Home & Living',
    slug: 'home',
    color: '#FFFBEB',
    textColor: '#B45309',
    productImage: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=300&fit=crop',
  },
  {
    name: 'Beauty & Care',
    slug: 'beauty',
    color: '#FDF2F8',
    textColor: '#9D174D',
    productImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop',
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports',
    color: '#FFF1F2',
    textColor: '#BE123C',
    productImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',
  },
  {
    name: 'Gaming',
    slug: 'gaming',
    color: '#F0F9FF',
    textColor: '#0369A1',
    productImage: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
  },
  {
    name: 'Kids & Baby',
    slug: 'kids',
    color: '#FFF7ED',
    textColor: '#C2410C',
    productImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop&crop=faces',
  },
  {
    name: 'Automotive',
    slug: 'automotive',
    color: '#F8FAFC',
    textColor: '#475569',
    productImage: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=300&fit=crop',
  },
  {
    name: 'Books & Media',
    slug: 'books',
    color: '#F0FDF4',
    textColor: '#166534',
    productImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
  },
  {
    name: 'Office & Stationery',
    slug: 'office',
    color: '#FAFAF9',
    textColor: '#57534E',
    productImage: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
  },
  {
    name: 'Others',
    slug: 'other',
    color: '#F5F3FF',
    textColor: '#6D28D9',
    productImage: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=300&fit=crop',
    lifestyleImage: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop',
  },
]

const CARD_WIDTH = 220
const CARD_GAP = 16
const SCROLL_AMOUNT = (CARD_WIDTH + CARD_GAP) * 3

export function CategorySection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 8)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: 'smooth' })
  }

  return (
    <section className="bg-white py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-brand-orange text-xs font-bold tracking-[0.25em] uppercase mb-2">
              Shop by Category
            </p>
            <h2 className="font-satoshi text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
              What are you looking for?
            </h2>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-brand-orange hover:underline hidden sm:block">
            Browse all →
          </Link>
        </div>

        {/* Scrollable row */}
        <div className="group/row relative">

          {/* Left arrow */}
          <button
            onClick={() => scroll('left')}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10
              w-10 h-10 rounded-full bg-white shadow-card border border-neutral-200
              flex items-center justify-center text-neutral-700 hover:bg-neutral-50
              transition-all duration-200
              ${showLeft ? 'opacity-0 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Cards container */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto no-scrollbar pb-1"
          >
            {CATEGORIES.map(({ name, slug, productImage, lifestyleImage }) => (
              <Link
                key={slug}
                href={`/category/${slug}`}
                className="group/card relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer"
                style={{ width: CARD_WIDTH, height: 260 }}
              >
                {/* Background color base */}
                <div className="absolute inset-0 bg-neutral-100" />

                {/* Product image — default state */}
                <div className="absolute inset-0 transition-opacity duration-500 ease-in-out group-hover/card:opacity-0">
                  <Image
                    src={productImage}
                    alt={name}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                {/* Lifestyle image — hover state */}
                <div className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-in-out group-hover/card:opacity-100">
                  <Image
                    src={lifestyleImage}
                    alt={`${name} lifestyle`}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                </div>

                {/* Category name label */}
                <div className="absolute bottom-0 inset-x-0 p-4 z-10">
                  <span className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase px-2.5 py-1 rounded-full mb-1.5 bg-white/90 text-neutral-900">
                    {name}
                  </span>
                  <p className="text-white text-xs font-medium opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                    Shop now →
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scroll('right')}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10
              w-10 h-10 rounded-full bg-white shadow-card border border-neutral-200
              flex items-center justify-center text-neutral-700 hover:bg-neutral-50
              transition-all duration-200
              ${showRight ? 'opacity-0 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
