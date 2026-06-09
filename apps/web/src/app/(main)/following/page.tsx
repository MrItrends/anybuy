'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { UserCheck, Users } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface FollowedSeller {
  seller_id: string
  full_name: string
  avatar_url: string | null
  is_verified: boolean
  rating: number
  rating_count: number
  followed_at: string
}

export default function FollowingPage() {
  const { user } = useAuthStore()
  const router   = useRouter()
  const [sellers, setSellers] = useState<FollowedSeller[]>([])
  const [loading, setLoading] = useState(true)
  const [unfollowing, setUnfollowing] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/'); return }

    createClient()
      .from('seller_follows')
      .select(`
        seller_id,
        created_at,
        seller:profiles!seller_id(full_name, avatar_url, is_verified, rating, rating_count)
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSellers(
          (data ?? []).map((row: any) => {
            const s = Array.isArray(row.seller) ? row.seller[0] : row.seller
            return {
              seller_id:   row.seller_id,
              full_name:   s?.full_name ?? 'Seller',
              avatar_url:  s?.avatar_url ?? null,
              is_verified: s?.is_verified ?? false,
              rating:      s?.rating ?? 0,
              rating_count: s?.rating_count ?? 0,
              followed_at: row.created_at,
            }
          })
        )
        setLoading(false)
      })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function unfollow(sellerId: string) {
    if (!user) return
    setUnfollowing(sellerId)
    const { error } = await createClient()
      .from('seller_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('seller_id', sellerId)

    if (error) {
      toast.error('Could not unfollow. Try again.')
    } else {
      setSellers(prev => prev.filter(s => s.seller_id !== sellerId))
      toast.success('Unfollowed')
    }
    setUnfollowing(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Users size={22} className="text-brand-orange" />
        <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Following</h1>
        {!loading && sellers.length > 0 && (
          <span className="text-sm text-neutral-400">({sellers.length})</span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-24 bg-neutral-50 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Users size={24} className="text-neutral-300" />
          </div>
          <p className="font-semibold text-neutral-700">Not following anyone yet</p>
          <p className="text-sm text-neutral-400 mt-1">Follow sellers to see their new listings first</p>
          <Link href="/" className="mt-5 inline-block text-sm text-brand-orange font-semibold hover:underline">
            Discover sellers →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sellers.map(s => (
            <div key={s.seller_id} className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-4">
              {/* Avatar */}
              <Link href={`/sellers/${s.seller_id}`} className="flex-shrink-0">
                {s.avatar_url ? (
                  <Image src={s.avatar_url} alt={s.full_name} width={48} height={48} className="rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold text-lg">
                    {s.full_name[0]?.toUpperCase()}
                  </div>
                )}
              </Link>

              {/* Info */}
              <Link href={`/sellers/${s.seller_id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-neutral-900 text-sm truncate">{s.full_name}</p>
                  {s.is_verified && (
                    <UserCheck size={13} className="text-brand-green flex-shrink-0" />
                  )}
                </div>
                {s.rating_count > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    ⭐ {s.rating.toFixed(1)} · {s.rating_count} review{s.rating_count !== 1 ? 's' : ''}
                  </p>
                )}
              </Link>

              {/* Unfollow */}
              <button
                onClick={() => unfollow(s.seller_id)}
                disabled={unfollowing === s.seller_id}
                className="flex-shrink-0 h-8 px-3 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {unfollowing === s.seller_id ? '…' : 'Unfollow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
