'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { AlertTriangle, Bell, CheckCheck, PauseCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleClick(id: string) {
    await markRead(id)
    setOpen(false)
    router.push('/seller/dashboard?tab=listings')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <span className="font-satoshi font-bold text-neutral-900 text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-brand-orange transition-colors"
              >
                <CheckCheck size={12} />Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-50">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={20} className="text-neutral-200 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">No notifications yet</p>
              </div>
            ) : notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors ${!n.read_at ? 'bg-orange-50/50' : ''}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                  ${n.type === 'listing_paused' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                  {n.type === 'listing_paused'
                    ? <PauseCircle size={14} />
                    : <AlertTriangle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">
                    {n.type === 'listing_paused'
                      ? `Listing paused: ${n.payload.product_title}`
                      : `Stock low: ${n.payload.product_title}`}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {n.type === 'listing_paused'
                      ? 'Out of stock — update quantity to resume'
                      : `${n.payload.quantity} unit${n.payload.quantity !== 1 ? 's' : ''} remaining`}
                  </p>
                  <p className="text-[11px] text-neutral-300 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_at && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
