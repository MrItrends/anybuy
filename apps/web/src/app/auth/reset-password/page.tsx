'use client'

import { Button } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-8">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src="/form_Logo.svg" alt="AnyBuy" width={100} height={30} className="h-8 w-auto" />
        </div>

        {done ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center mb-4">
              <CheckCircle size={28} className="text-brand-green" />
            </div>
            <h1 className="font-satoshi text-xl font-bold text-neutral-900 mb-2">
              Password updated!
            </h1>
            <p className="text-sm text-neutral-600 mb-6">
              Your password has been changed successfully. You're now signed in.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-brand-orange text-white font-semibold rounded-xl hover:bg-brand-orange/90 transition-colors"
            >
              Go to AnyBuy
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="font-satoshi text-xl font-bold text-neutral-900 text-center mb-1">
              Set a new password
            </h1>
            <p className="text-sm text-neutral-600 text-center mb-6">
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition"
                />
              </div>

              {/* Strength hint */}
              {password.length > 0 && (
                <div className="flex gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= [8, 10, 12, 16][i]
                          ? i < 2 ? 'bg-amber-400' : i === 2 ? 'bg-brand-green' : 'bg-brand-green'
                          : 'bg-neutral-200'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Update Password
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
