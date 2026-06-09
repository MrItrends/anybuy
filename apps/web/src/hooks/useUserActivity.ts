'use client'

import { useCartStore } from '@/stores/cart'
import type { CategorySlug } from '@anybuy/types'
import { useEffect, useState } from 'react'

// Keys
const VIEWS_KEY     = 'anybuy_viewed'        // string[] of product IDs
const CATS_KEY      = 'anybuy_cats'           // Record<category, viewCount>
const SESSION_KEY   = 'anybuy_session_start'  // epoch ms

// Call this from the product detail page on every view
export function trackProductView(productId: string, category: string) {
  try {
    const viewed: string[] = JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]')
    if (!viewed.includes(productId)) {
      viewed.push(productId)
      localStorage.setItem(VIEWS_KEY, JSON.stringify(viewed.slice(-200))) // cap at 200
    }

    const cats: Record<string, number> = JSON.parse(localStorage.getItem(CATS_KEY) ?? '{}')
    cats[category] = (cats[category] ?? 0) + 1
    localStorage.setItem(CATS_KEY, JSON.stringify(cats))
  } catch {
    // localStorage can be blocked in some contexts — silently ignore
  }
}

export type EngagementLevel = 'none' | 'early' | 'mid' | 'high'

export interface UserActivity {
  viewedCount: number
  browseMinutes: number
  cartCount: number
  topCategories: CategorySlug[]
  engagementLevel: EngagementLevel
  /** Label to show in the recommended section header — null if not shown yet */
  recommendedLabel: string | null
  showRecommended: boolean
}

export function useUserActivity(): UserActivity {
  const cartItems = useCartStore(s => s.items)
  const cartCount = cartItems.length

  const [activity, setActivity] = useState<UserActivity>({
    viewedCount: 0,
    browseMinutes: 0,
    cartCount: 0,
    topCategories: [],
    engagementLevel: 'none',
    recommendedLabel: null,
    showRecommended: false,
  })

  useEffect(() => {
    // Start session timer if not already running
    if (!localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, Date.now().toString())
    }

    function compute() {
      try {
        const viewed: string[] = JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]')
        const cats: Record<string, number> = JSON.parse(localStorage.getItem(CATS_KEY) ?? '{}')
        const sessionStart = Number(localStorage.getItem(SESSION_KEY) ?? Date.now())
        const browseMinutes = Math.floor((Date.now() - sessionStart) / 60_000)

        const viewedCount = viewed.length

        // Rank categories by how many times the user visited them
        const topCategories = Object.entries(cats)
          .sort(([, a], [, b]) => b - a)
          .map(([cat]) => cat as CategorySlug)

        // Engagement score: each threshold contributes points
        let score = 0
        if (viewedCount >= 10)     score += 3
        else if (viewedCount >= 5)  score += 2
        else if (viewedCount >= 2)  score += 1

        if (cartCount >= 2)        score += 3
        else if (cartCount >= 1)   score += 2

        if (browseMinutes >= 10)   score += 2
        else if (browseMinutes >= 5) score += 1

        const engagementLevel: EngagementLevel =
          score >= 5 ? 'high' :
          score >= 3 ? 'mid'  :
          score >= 1 ? 'early': 'none'

        const showRecommended = engagementLevel !== 'none'

        const recommendedLabel =
          engagementLevel === 'high'  ? 'Based on your activity' :
          engagementLevel === 'mid'   ? 'Recommended for you'    :
          engagementLevel === 'early' ? 'Popular for you'        : null

        setActivity({ viewedCount, browseMinutes, cartCount, topCategories, engagementLevel, recommendedLabel, showRecommended })
      } catch {
        // ignore
      }
    }

    compute()
    const interval = setInterval(compute, 60_000) // recheck every minute
    return () => clearInterval(interval)
  }, [cartCount])

  return activity
}
