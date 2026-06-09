'use client'

import { createClient } from '@/lib/supabase/client'
import type { Product } from '@anybuy/types'
import { useEffect, useRef, useState } from 'react'
import { useUserActivity } from '@/hooks/useUserActivity'
import { SectionRow, SectionRowSkeleton } from './SectionRow'

interface DiscoverySections {
  justListed: Product[]
  trending:   Product[]
  deals:      Product[]
  budget:     Product[]
  quickPicks: Product[]
  // nearYou is absent — fetched client-side once city is known
}

interface HomeDiscoveryProps {
  sections: DiscoverySections
}

const PRODUCT_SELECT = `
  id, seller_id, title, description, price, category, subcategory,
  condition, thumbnail_url, location, is_negotiable, is_available,
  view_count, created_at, updated_at,
  seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
`

function mapProducts(data: any[]): Product[] {
  return (data ?? []).map(p => ({
    ...p,
    media: [],
    seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
  }))
}

// Detect buyer's city via IP geolocation (no permission prompt required).
// Falls back to null if offline or the API is unavailable.
async function detectCity(): Promise<string | null> {
  try {
    const res = await fetch('https://ipinfo.io/json', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    // ipinfo returns city like "Lagos", "Abuja", "Port Harcourt"
    return (data.city as string) ?? null
  } catch {
    return null
  }
}

export function HomeDiscovery({ sections }: HomeDiscoveryProps) {
  const activity = useUserActivity()

  // Personalized recommendations (unlocked after enough engagement)
  const [recommended, setRecommended]   = useState<Product[]>([])
  const fetchedForCats = useRef<string>('')

  // Near You (fetched once city is resolved)
  const [nearYou, setNearYou]           = useState<Product[]>([])
  const [detectedCity, setDetectedCity] = useState<string | null>(null)
  const [cityLoading, setCityLoading]   = useState(true)
  const fetchedForCity = useRef<string>('')

  // ── Detect buyer city on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    detectCity().then(city => {
      if (cancelled) return
      setDetectedCity(city)
      setCityLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // ── Fetch Near You products once city is known ──────────────────────────
  useEffect(() => {
    if (!detectedCity) return
    if (fetchedForCity.current === detectedCity) return
    fetchedForCity.current = detectedCity

    const supabase = createClient()
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_available', true)
      // Match seller location — sellers fill this during onboarding
      .ilike('location', `%${detectedCity}%`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setNearYou(mapProducts(data))
      })
  }, [detectedCity])

  // ── Personalized recommendations ────────────────────────────────────────
  useEffect(() => {
    if (!activity.showRecommended || activity.topCategories.length === 0) return

    const cacheKey = activity.topCategories.slice(0, 3).join(',')
    if (fetchedForCats.current === cacheKey) return
    fetchedForCats.current = cacheKey

    const supabase = createClient()
    supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('is_available', true)
      .in('category', activity.topCategories.slice(0, 3))
      .order('view_count', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRecommended(mapProducts(data))
      })
  }, [activity.showRecommended, activity.topCategories])

  const { justListed, trending, deals, budget, quickPicks } = sections

  return (
    <div className="py-10 space-y-12">

      {/* ── 0. Just Listed — guaranteed slot for every new product ── */}
      {justListed.length > 0 && (
        <SectionRow
          title="Just Listed"
          subtitle="Freshest listings on AnyBuy right now"
          emoji="🆕"
          products={justListed}
          seeAllHref="/search?sort=newest"
        />
      )}

      {/* ── Personalised (unlocked after engagement) ── */}
      {activity.showRecommended && recommended.length > 0 && (
        <SectionRow
          title={activity.recommendedLabel!}
          subtitle={
            activity.engagementLevel === 'high' ? 'Tailored to your browsing and purchase history' :
            activity.engagementLevel === 'mid'  ? "Based on categories you've been exploring"      :
                                                  'Items gaining traction in your areas of interest'
          }
          emoji="✨"
          products={recommended}
          seeAllHref="/search"
        />
      )}

      {/* ── 1. Trending ── */}
      <SectionRow
        title="Trending Now"
        subtitle="What's getting attention across the platform"
        emoji="🔥"
        products={trending}
        seeAllHref="/search?sort=trending"
      />

      {/* ── 2. Near You (priority slot — only renders once city is resolved) ── */}
      {!cityLoading && nearYou.length > 0 && (
        <SectionRow
          title="Near You"
          subtitle={`Sellers shipping from ${detectedCity} — faster pickup & delivery`}
          emoji="📍"
          products={nearYou}
          seeAllHref={`/search?location=${encodeURIComponent(detectedCity ?? '')}`}
        />
      )}

      {/* ── 3. Top deals ── */}
      {deals.length > 0 && (
        <SectionRow
          title="Top Deals"
          subtitle="Sellers open to negotiation on quality items"
          emoji="💰"
          products={deals}
          seeAllHref="/search?negotiable=true"
        />
      )}

      {/* ── 4. Quick picks ── */}
      {quickPicks.length > 0 && (
        <SectionRow
          title="Quick Picks"
          subtitle="High-quality items, great visuals, good pricing"
          emoji="⚡"
          products={quickPicks}
        />
      )}

      {/* ── 5. Budget friendly ── */}
      {budget.length > 0 && (
        <SectionRow
          title="Budget Friendly"
          subtitle="Great finds under ₦50,000"
          emoji="🏷️"
          products={budget}
          seeAllHref="/search?max=50000&sort=price_asc"
        />
      )}

    </div>
  )
}

export function HomeDiscoverySkeleton() {
  return (
    <div className="py-10 space-y-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <SectionRowSkeleton key={i} />
      ))}
    </div>
  )
}
