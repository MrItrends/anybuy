'use client'

/**
 * AuthProvider — syncs the Supabase session with the Zustand auth store.
 *
 * Without this, the store only knows about the user after an explicit login.
 * On page refresh, `onAuthStateChange` fires immediately with the restored
 * session (or SIGNED_OUT if the refresh token is expired), keeping the
 * Zustand store consistent with Supabase's actual auth state.
 */

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useEffect } from 'react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore(s => s.setUser)

  useEffect(() => {
    const supabase = createClient()

    async function syncUser(session: { user: { id: string; email?: string; created_at?: string; updated_at?: string; user_metadata?: Record<string, string> } } | null) {
      if (!session) { setUser(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,phone,avatar_url,role,is_verified,rating,rating_count,created_at,updated_at')
        .eq('id', session.user.id)
        .maybeSingle()
      // email lives in auth.users, not profiles — merge it from the session.
      // If no profiles row exists (e.g. admin accounts created via Supabase dashboard),
      // build a minimal placeholder so the auth store is never null for a valid session.
      setUser(data
        ? { ...data, email: session.user.email ?? '' }
        : {
            id:           session.user.id,
            email:        session.user.email ?? '',
            full_name:    session.user.user_metadata?.full_name ?? '',
            role:         'buyer' as const,
            avatar_url:   null,
            phone:        null,
            is_verified:  false,
            rating:       0,
            rating_count: 0,
            created_at:   session.user.created_at ?? new Date().toISOString(),
            updated_at:   session.user.updated_at ?? session.user.created_at ?? new Date().toISOString(),
          }
      )
    }

    // Fire once on mount so the store is populated before child effects run.
    // If the refresh token is stale (e.g. server restarted), sign out silently
    // rather than letting the AuthRetryableFetchError spam the console.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.message?.toLowerCase().includes('refresh token')) {
        supabase.auth.signOut()
        setUser(null)
        return
      }
      syncUser(session)
    })

    // Keep in sync for the lifetime of this tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setUser(null); return }
      if (event === 'TOKEN_REFRESH_FAILED') { supabase.auth.signOut(); setUser(null); return }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        syncUser(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser])

  return <>{children}</>
}
