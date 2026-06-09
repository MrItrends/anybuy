'use client'

import { createClient } from '@/lib/supabase/client'
import { ShieldAlert } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Sign in
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr || !data.user) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }

    // 2. Check admin_roles via server-side API (service role bypasses RLS)
    const res  = await fetch('/api/admin/check-role', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: data.user.id }),
    })
    const { role } = await res.json()

    if (!role) {
      await supabase.auth.signOut()
      setError('This account does not have admin access.')
      setLoading(false)
      return
    }

    // 3. Authorised — go to dashboard
    router.replace('/admin/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#080c12' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo + badge */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/Header_Light_Mode.svg"
            alt="AnyBuy"
            width={110}
            height={34}
            className="mb-4"
          />
          <div className="flex items-center gap-1.5 bg-red-500/15 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
            <ShieldAlert size={12} />
            Admin access only
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.06] p-8"
          style={{ background: '#0d1117' }}
        >
          <h1 className="font-satoshi text-xl font-bold text-white mb-1">Sign in</h1>
          <p className="text-white/40 text-sm mb-6">AnyBuy staff only.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@anybuy.ng"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]
                  text-white placeholder:text-white/20 text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                  transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]
                  text-white placeholder:text-white/20 text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent
                  transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-[#e85a2d] text-white
                font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-wait mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Not an admin?{' '}
          <a href="/" className="text-white/40 hover:text-white transition-colors">
            Go to marketplace
          </a>
        </p>
      </div>
    </div>
  )
}
