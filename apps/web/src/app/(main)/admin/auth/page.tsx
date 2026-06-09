'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Lock, LogIn } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminAuthPage() {
  const { user, setUser } = useAuthStore()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // If already logged in as an admin, redirect straight to dashboard
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase.from('admin_roles').select('role').eq('user_id', user.id).eq('is_active', true).maybeSingle()
      .then(({ data }) => {
        if (data) router.replace('/admin/dashboard')
      })
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Sign in with Supabase auth
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    // 2. Check for an active admin_roles row
    const { data: adminRow } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRow) {
      // Not an admin — sign them back out and show error
      await supabase.auth.signOut()
      setError('Access denied. This account does not have admin privileges.')
      setLoading(false)
      return
    }

    // 3. Hydrate auth store
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, is_verified, rating, rating_count, avatar_url, phone, created_at, updated_at')
      .eq('id', data.user.id)
      .single()

    setUser({
      id:           data.user.id,
      email:        data.user.email!,
      full_name:    profile?.full_name ?? '',
      role:         'admin',
      avatar_url:   profile?.avatar_url ?? null,
      phone:        profile?.phone ?? null,
      is_verified:  profile?.is_verified ?? false,
      rating:       profile?.rating ?? 0,
      rating_count: profile?.rating_count ?? 0,
      created_at:   profile?.created_at ?? data.user.created_at,
      updated_at:   profile?.updated_at ?? data.user.created_at,
    })

    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center mb-4">
            <Lock size={22} className="text-brand-orange" />
          </div>
          <Image src="/Footer_Light Mode.svg" alt="AnyBuy" width={110} height={44} className="h-8 w-auto mb-2" />
          <p className="text-white/40 text-sm">Admin access only</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6">
          <h1 className="font-satoshi font-bold text-white text-xl mb-1">Sign in</h1>
          <p className="text-white/40 text-sm mb-6">Use your AnyBuy admin credentials.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@anybuy.com"
                required
                className="w-full h-11 px-4 bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm rounded-xl focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-4 bg-white/5 border border-white/10 text-white placeholder:text-white/20 text-sm rounded-xl focus:outline-none focus:border-brand-orange transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand-orange hover:bg-[#e85a2d] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><LogIn size={16} />Sign In</>
              )}
            </button>
          </form>
        </div>

        <p className="text-white/20 text-xs text-center mt-6">
          This page is for authorised AnyBuy staff only.
        </p>
      </div>
    </div>
  )
}
