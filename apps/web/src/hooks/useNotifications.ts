'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SellerNotification {
  id: string
  type: 'low_stock' | 'listing_paused'
  product_id: string
  payload: { product_title: string; quantity: number; threshold?: number }
  read_at: string | null
  created_at: string
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<SellerNotification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (!userId) return

    async function fetchNotifications() {
      const res = await fetch('/api/notifications')
      if (!res.ok) { setLoading(false); return }
      const { notifications: data, unread_count } = await res.json()
      setNotifications(data)
      setUnreadCount(unread_count)
      setLoading(false)
    }

    fetchNotifications()

    // Realtime: prepend new notifications as they arrive
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `seller_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as SellerNotification
          setNotifications(prev => [n, ...prev].slice(0, 20))
          setUnreadCount(c => c + 1)
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markRead = useCallback(async (id: string) => {
    await fetch('/api/notifications', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    )
    setUnreadCount(c => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, loading, markRead, markAllRead }
}
