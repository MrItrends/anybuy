'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FollowButtonProps {
  sellerId: string
}

export function FollowButton({ sellerId }: FollowButtonProps) {
  const { user, requireAuth } = useAuthStore()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  // On mount: check if the current user already follows this seller
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('seller_follows')
      .select('seller_id')
      .eq('follower_id', user.id)
      .eq('seller_id', sellerId)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data))
  }, [user, sellerId])

  async function toggle() {
    if (!requireAuth('follow this seller')) return

    setLoading(true)
    const supabase = createClient()

    if (following) {
      await supabase
        .from('seller_follows')
        .delete()
        .eq('follower_id', user!.id)
        .eq('seller_id', sellerId)
      setFollowing(false)
    } else {
      await supabase
        .from('seller_follows')
        .insert({ follower_id: user!.id, seller_id: sellerId })
      setFollowing(true)
    }

    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
        following
          ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          : 'bg-brand-orange text-white hover:bg-brand-orange/90'
      } disabled:opacity-50`}
    >
      {following ? <BellOff size={15} /> : <Bell size={15} />}
      {following ? 'Following' : 'Follow Store'}
    </button>
  )
}
