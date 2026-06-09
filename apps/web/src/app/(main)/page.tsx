import { CategorySection } from '@/components/home/CategorySection'
import { HeroSection } from '@/components/home/HeroSection'
import { HomeDiscovery, HomeDiscoverySkeleton } from '@/components/home/HomeDiscovery'
import { LiveSection } from '@/components/home/LiveSection'
import { MarqueeShowcase } from '@/components/home/MarqueeShowcase'
import { SellerRedirect } from '@/components/home/SellerRedirect'
import { TrustBanner } from '@/components/home/TrustBanner'
import { createClient } from '@/lib/supabase/server'
import type { Product } from '@anybuy/types'
import { Suspense } from 'react'

// Always fetch fresh — new listings must appear immediately
export const dynamic = 'force-dynamic'

const SELECT = `
  id, seller_id, title, description, price, category, subcategory,
  condition, thumbnail_url, location, is_negotiable, is_available,
  view_count, created_at, updated_at,
  seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)
`

function mapProducts(data: any[] | null): Product[] {
  return (data ?? []).map(p => ({
    ...p,
    media: [],
    seller: Array.isArray(p.seller) ? p.seller[0] : p.seller,
  }))
}

async function fetchSections() {
  const supabase = await createClient()

  const [
    { data: justListedData },
    { data: trendingData },
    { data: dealsData },
    { data: budgetData },
    { data: quickPicksData },
  ] = await Promise.all([

    // 🆕 Just Listed: most recent — NO extra filters, every new product appears here
    supabase.from('products')
      .select(SELECT).eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(6),

    // 🔥 Trending: highest view counts
    supabase.from('products')
      .select(SELECT).eq('is_available', true)
      .order('view_count', { ascending: false })
      .limit(6),

    // 💰 Top deals: negotiable items in good condition
    supabase.from('products')
      .select(SELECT).eq('is_available', true)
      .eq('is_negotiable', true)
      .in('condition', ['new', 'grade_a', 'grade_b'])
      .order('view_count', { ascending: false })
      .limit(6),

    // 🏷️ Budget friendly: under ₦50,000
    supabase.from('products')
      .select(SELECT).eq('is_available', true)
      .lte('price', 50000)
      .order('price', { ascending: true })
      .limit(6),

    // ⚡ Quick picks: high-quality visuals, new or grade-A condition
    supabase.from('products')
      .select(SELECT).eq('is_available', true)
      .not('thumbnail_url', 'is', null)
      .in('condition', ['new', 'grade_a'])
      .order('view_count', { ascending: false })
      .limit(6),
  ])

  return {
    justListed: mapProducts(justListedData),
    trending:   mapProducts(trendingData),
    deals:      mapProducts(dealsData),
    budget:     mapProducts(budgetData),
    quickPicks: mapProducts(quickPicksData),
    // nearYou is fetched client-side — the server doesn't know the buyer's city
  }
}

export default async function HomePage() {
  const sections = await fetchSections()

  return (
    <div className="bg-brand-off-white">
      <Suspense>
        <SellerRedirect />
      </Suspense>
      <HeroSection />
      <LiveSection />
      <CategorySection />
      <TrustBanner />
      <Suspense fallback={<HomeDiscoverySkeleton />}>
        <HomeDiscovery sections={sections} />
      </Suspense>
      <MarqueeShowcase />
    </div>
  )
}
