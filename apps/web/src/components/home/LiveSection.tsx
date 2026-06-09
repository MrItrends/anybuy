'use client'

import { createClient } from '@/lib/supabase/client'
import { LiveBadge } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { Users } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface LiveSession {
  id: string
  title: string
  thumbnail_url: string | null
  viewer_count: number
  status: 'live' | 'waiting'
  seller_id: string
  seller_profile: { store_name: string } | null
}

export function LiveSection() {
  const { user, openLoginModal } = useAuthStore()
  const router = useRouter()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()

    // Fetch 7 of each to detect overflow beyond the 6-card display limit
    const [{ data: liveSessions }, { data: waitingSessions }] = await Promise.all([
      supabase
        .from('live_sessions')
        .select('id, title, thumbnail_url, viewer_count, status, seller_id')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false })
        .limit(7),
      supabase
        .from('live_sessions')
        .select('id, title, thumbnail_url, viewer_count, status, seller_id')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false })
        .limit(7),
    ])

    const combined = [...(liveSessions ?? []), ...(waitingSessions ?? [])].slice(0, 7)
    if (combined.length === 0) return

    const more = combined.length > 6
    const toShow = combined.slice(0, 6)

    // Fetch seller profiles separately (no FK relation)
    const sellerIds = [...new Set(toShow.map((s: any) => s.seller_id))]
    const { data: profiles } = await supabase
      .from('seller_profiles')
      .select('user_id, store_name')
      .in('user_id', sellerIds)

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) profileMap[p.user_id] = p.store_name

    setSessions(toShow.map((s: any) => ({
      ...s,
      seller_profile: profileMap[s.seller_id] ? { store_name: profileMap[s.seller_id] } : null,
    })))
    setHasMore(more)
  }

  function handleJoin(sessionId: string) {
    if (!user) { openLoginModal('live'); return }
    router.push(`/live/${sessionId}`)
  }

  if (sessions.length === 0) return null

  const allLive    = sessions.every(s => s.status === 'live')
  const allWaiting = sessions.every(s => s.status === 'waiting')
  const sectionTitle = allLive ? 'Live Now' : allWaiting ? 'Starting Soon' : 'Live & Starting Soon'

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-satoshi text-2xl font-bold text-neutral-900">{sectionTitle}</h2>
          {!allWaiting && <LiveBadge />}
        </div>
        {hasMore && (
          <a href="/live" className="text-brand-orange text-sm font-semibold hover:underline">
            View all →
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => handleJoin(session.id)}
            className="group relative overflow-hidden rounded-2xl aspect-video bg-neutral-900 text-left"
          >
            {session.thumbnail_url ? (
              <Image
                src={session.thumbnail_url}
                alt={session.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-neutral-800" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute top-3 left-3">
              {session.status === 'live'
                ? <LiveBadge viewerCount={session.viewer_count} />
                : <span className="bg-amber-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">SOON</span>
              }
            </div>

            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-white font-satoshi font-bold text-base leading-tight line-clamp-1">{session.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Users size={12} className="text-white/70" />
                <span className="text-white/70 text-xs">{session.seller_profile?.store_name ?? 'Seller'}</span>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="bg-brand-orange text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-orange">
                {session.status === 'live' ? 'Join Live' : 'Preview'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
