'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function SellerRedirect() {
  const { user } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // ?buyer=1 means the seller explicitly clicked "View marketplace" — don't redirect
    if (searchParams.get('buyer') === '1') return
    if (!user) return

    // If the auth store already knows this user is a seller, redirect immediately
    // and set the cookie so middleware handles it on future navigations
    if (user.role === 'seller') {
      document.cookie = 'anybuy-seller=1; path=/; max-age=2592000; SameSite=Lax'
      router.replace('/seller/dashboard')
      return
    }

    // Fallback: check seller_profiles in case role wasn't synced in the store
    async function check() {
      const supabase = createClient()
      const { data } = await supabase
        .from('seller_profiles')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (data) {
        document.cookie = 'anybuy-seller=1; path=/; max-age=2592000; SameSite=Lax'
        router.replace('/seller/dashboard')
      }
    }

    check()
  }, [user, router, searchParams])

  return null
}
