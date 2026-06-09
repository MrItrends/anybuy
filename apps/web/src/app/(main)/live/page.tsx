'use client'

import { createClient } from '@/lib/supabase/client'
import { LiveBadge } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { Loader2, Radio, Users } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Session {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  viewer_count: number
  status: string
  started_at: string | null
  seller_profile: { store_name: string } | null
}

export default function LiveBrowsePage() {
  const { user, openLoginModal } = useAuthStore()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'soon' | 'scheduled'>('soon')

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    const supabase = createClient()

    let allSessions: any[] = []

    if (filter === 'soon') {
      // Fetch live + waiting; live first (viewer_count desc), then waiting (created_at desc)
      const [{ data: liveSessions }, { data: waitingSessions }] = await Promise.all([
        supabase
          .from('live_sessions')
          .select('id, title, description, thumbnail_url, viewer_count, status, started_at, scheduled_at, seller_id')
          .eq('status', 'live')
          .order('viewer_count', { ascending: false })
          .limit(24),
        supabase
          .from('live_sessions')
          .select('id, title, description, thumbnail_url, viewer_count, status, started_at, scheduled_at, seller_id')
          .eq('status', 'waiting')
          .order('created_at', { ascending: false })
          .limit(24),
      ])
      allSessions = [...(liveSessions ?? []), ...(waitingSessions ?? [])].slice(0, 24)
    } else {
      const { data } = await supabase
        .from('live_sessions')
        .select('id, title, description, thumbnail_url, viewer_count, status, started_at, scheduled_at, seller_id')
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(24)
      allSessions = data ?? []
    }

    const sessions = allSessions

    if (!sessions || sessions.length === 0) {
      setSessions([])
      setLoading(false)
      return
    }

    // Fetch seller profiles separately (no FK join needed)
    const sellerIds = [...new Set(sessions.map((s: any) => s.seller_id))]
    const { data: profiles } = await supabase
      .from('seller_profiles')
      .select('user_id, store_name')
      .in('user_id', sellerIds)

    const profileMap: Record<string, string> = {}
    for (const p of profiles ?? []) profileMap[p.user_id] = p.store_name

    setSessions(sessions.map((s: any) => ({
      ...s,
      seller_profile: profileMap[s.seller_id] ? { store_name: profileMap[s.seller_id] } : null,
    })))
    setLoading(false)
  }

  function join(sessionId: string) {
    if (!user) { openLoginModal('live'); return }
    router.push(`/live/${sessionId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Radio size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Live Selling</h1>
          <p className="text-neutral-500 text-sm">Watch sellers show items live and bid in real time</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {([
            { key: 'soon', label: '🔴 Live & Soon' },
            { key: 'scheduled', label: '📅 Scheduled' },
          ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${filter === f.key ? 'bg-brand-dark text-white' : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-neutral-300" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-24">
          <Radio size={32} className="text-neutral-200 mx-auto mb-3" />
          <p className="font-semibold text-neutral-600">
            {filter === 'soon' ? 'No live or upcoming sessions right now' : 'No scheduled sessions'}
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            {filter === 'soon'
              ? <>Check the <button onClick={() => setFilter('scheduled')} className="text-brand-orange underline">Scheduled</button> tab for upcoming sessions.</>
              : 'Check back soon or explore listings below.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sessions.map(session => (
            <button key={session.id} onClick={() => join(session.id)}
              className="group relative overflow-hidden rounded-2xl aspect-video bg-neutral-900 text-left">
              {session.thumbnail_url ? (
                <Image src={session.thumbnail_url} alt={session.title} fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-dark to-neutral-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3">
                {session.status === 'live'
                  ? <LiveBadge viewerCount={session.viewer_count} />
                  : session.status === 'waiting'
                    ? <span className="bg-amber-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">SOON</span>
                    : session.status === 'scheduled' && (session as any).scheduled_at
                      ? <span className="bg-blue-500/80 text-white text-[11px] font-bold px-2 py-1 rounded-full">
                          📅 {new Date((session as any).scheduled_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      : <span className="bg-amber-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">SOON</span>
                }
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-satoshi font-bold text-sm leading-tight line-clamp-1">{session.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users size={11} className="text-white/60" />
                  <span className="text-white/60 text-xs">{session.seller_profile?.store_name ?? 'Seller'}</span>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-brand-orange text-white font-bold text-sm px-5 py-2.5 rounded-full">
                  {session.status === 'live' ? 'Join Live' : 'View'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
