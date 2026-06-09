'use client'

import { Button, Input, Modal } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Mail, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

const DEFAULT_REASONS: Record<string, { title: string; description: string }> = {
  purchase: {
    title: 'Sign in to purchase',
    description: 'Create a free account to buy securely with our escrow protection.',
  },
  live: {
    title: 'Sign in to join live',
    description: 'Watch sellers show products in real time and buy instantly.',
  },
  chat: {
    title: 'Sign in to message seller',
    description: 'Chat directly with the seller to ask questions before buying.',
  },
  bid: {
    title: 'Sign in to place a bid',
    description: 'Sign in to participate in this listing.',
  },
  sell: {
    title: 'Sign in to start selling',
    description: 'Create a free AnyBuy account to list your items and earn money.',
  },
  ride: {
    title: 'Sign up to deliver',
    description: 'Create a free account and start earning by delivering for AnyBuy buyers.',
  },
  default: {
    title: 'Sign in to continue',
    description: 'Create a free AnyBuy account to buy and sell with confidence.',
  },
}

type Tab = 'login' | 'signup'
type View = 'form' | 'verify-email' | 'forgot-password' | 'forgot-sent'

export function LoginModal() {
  const { loginModalOpen, loginModalReason, closeLoginModal, setUser } = useAuthStore()
  const router = useRouter()
  const [view, setView] = useState<View>('form')
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  // tracks if login failed due to unverified email
  const [unverifiedEmail, setUnverifiedEmail] = useState('')

  const reason = DEFAULT_REASONS[loginModalReason ?? 'default'] ?? DEFAULT_REASONS.default

  function resetModal() {
    setView('form')
    setTab('login')
    setEmail('')
    setPassword('')
    setName('')
    setError('')
    setUnverifiedEmail('')
    setResent(false)
  }

  function handleClose() {
    closeLoginModal()
    // small delay so the reset doesn't flash before modal finishes closing
    setTimeout(resetModal, 300)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setUnverifiedEmail('')

    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      // Supabase returns "Email not confirmed" for unverified accounts
      if (err.message.toLowerCase().includes('not confirmed') || err.message.toLowerCase().includes('email')) {
        setUnverifiedEmail(email)
        setError('Your email address hasn\'t been verified yet.')
      } else if (err.message.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password.')
      } else {
        setError(err.message)
      }
    } else if (data.user) {
      // Fetch the real profile so role, rating, etc. are accurate
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, is_verified, rating, rating_count, avatar_url, phone, created_at, updated_at')
        .eq('id', data.user.id)
        .single()

      setUser({
        id: data.user.id,
        email: data.user.email!,
        full_name: profile?.full_name ?? data.user.user_metadata?.full_name ?? '',
        role: (profile?.role ?? 'buyer') as 'buyer' | 'seller' | 'admin' | 'rider',
        avatar_url: profile?.avatar_url ?? null,
        phone: profile?.phone ?? null,
        is_verified: profile?.is_verified ?? false,
        rating: profile?.rating ?? 0,
        rating_count: profile?.rating_count ?? 0,
        created_at: profile?.created_at ?? data.user.created_at,
        updated_at: profile?.updated_at ?? data.user.created_at,
      })
      closeLoginModal()
      resetModal()

      if (profile?.role === 'seller') {
        document.cookie = 'anybuy-seller=1; path=/; max-age=2592000; SameSite=Lax'
        document.cookie = 'anybuy-rider=; path=/; max-age=0'
        toast.success('Welcome back!')
        router.push('/seller/dashboard')
      } else if (profile?.role === 'rider') {
        document.cookie = 'anybuy-rider=1; path=/; max-age=2592000; SameSite=Lax'
        document.cookie = 'anybuy-seller=; path=/; max-age=0'
        toast.success('Welcome back!')
        router.push('/rider/dashboard')
      } else if (loginModalReason === 'ride') {
        // Signed in from the rider landing page — stay there.
        // The page's "Start earning" CTA will check for a rider profile
        // and route to /rider/onboarding or /rider/dashboard as needed.
        toast.success('Welcome back!')
      } else {
        document.cookie = 'anybuy-seller=; path=/; max-age=0'
        document.cookie = 'anybuy-rider=; path=/; max-age=0'
        toast.success('Welcome back!')
      }
    }
    setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (err) {
      setError(err.message)
    } else if (data.user) {
      // Show the verify screen — don't close the modal
      setView('verify-email')
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })
    if (err) {
      setError(err.message)
    } else {
      setView('forgot-sent')
    }
    setLoading(false)
  }

  async function handleResend() {
    setResending(true)
    const supabase = createClient()
    const targetEmail = unverifiedEmail || email
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: targetEmail })
    if (err) {
      toast.error('Could not resend. Try again shortly.')
    } else {
      setResent(true)
      toast.success('Verification email sent!')
    }
    setResending(false)
  }

  return (
    <Modal
      open={loginModalOpen}
      onClose={handleClose}
      size="sm"
      showCloseButton={false}
    >
      {/* ── Forgot password: sent view ── */}
      {view === 'forgot-sent' ? (
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-5">
            <Mail size={28} className="text-brand-orange" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900 font-satoshi mb-2">Check your inbox</h2>
          <p className="text-sm text-neutral-600 mb-1">We sent a password reset link to</p>
          <p className="text-sm font-semibold text-neutral-900 mb-5 break-all">{email}</p>
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left mb-6">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Click the link in the email to set a new password. Check your spam folder if you don't see it within a minute.
            </p>
          </div>
          <button
            onClick={() => { setView('form'); setTab('login'); setError('') }}
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Back to sign in
          </button>
          <button onClick={handleClose} className="mt-3 text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
            Close
          </button>
        </div>

      ) : view === 'forgot-password' ? (
        /* ── Forgot password: request view ── */
        <div className="flex flex-col">
          <div className="flex flex-col items-center text-center mb-6">
            <Image src="/form_Logo.svg" alt="AnyBuy" width={90} height={28} className="mb-4 h-7 w-auto" />
            <h2 className="text-xl font-bold text-neutral-900 font-satoshi">Reset your password</h2>
            <p className="text-sm text-neutral-600 mt-1">Enter your email and we'll send a reset link.</p>
          </div>
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Send Reset Link
            </Button>
          </form>
          <button
            onClick={() => { setView('form'); setTab('login'); setError('') }}
            className="w-full mt-3 text-sm text-neutral-600 hover:text-neutral-900 transition-colors text-center"
          >
            Back to sign in
          </button>
        </div>

      ) : /* ── Verify email view ── */
      view === 'verify-email' ? (
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-5">
            <Mail size={28} className="text-brand-orange" />
          </div>

          <h2 className="text-xl font-bold text-neutral-900 font-satoshi mb-2">
            Check your inbox
          </h2>
          <p className="text-sm text-neutral-600 mb-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-semibold text-neutral-900 mb-5 break-all">{email}</p>

          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left mb-6">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Click the link in the email to activate your account, then come back here and sign in.
              Check your spam folder if you don't see it within a minute.
            </p>
          </div>

          {/* Resend */}
          {resent ? (
            <p className="text-sm text-brand-green font-medium mb-4">✓ Email resent successfully</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-orange transition-colors mb-4 disabled:opacity-50"
            >
              <RotateCcw size={13} className={resending ? 'animate-spin' : ''} />
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          )}

          <button
            onClick={() => {
              setView('form')
              setTab('login')
              setPassword('')
              setError('')
            }}
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Back to sign in
          </button>

          <button
            onClick={handleClose}
            className="mt-3 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (

      /* ── Form view ── */
      <>
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Image
            src="/form_Logo.svg"
            alt="AnyBuy"
            width={90}
            height={28}
            className="mb-4 h-7 w-auto"
          />
          <h2 className="text-xl font-bold text-neutral-900 font-satoshi">{reason.title}</h2>
          <p className="text-sm text-neutral-600 mt-1">{reason.description}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-100 rounded-xl p-1 mb-5">
          {(['login', 'signup'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setUnverifiedEmail('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === t
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-4">
          {tab === 'signup' && (
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {tab === 'login' && (
              <button
                type="button"
                onClick={() => { setView('forgot-password'); setError('') }}
                className="mt-1.5 text-xs text-neutral-500 hover:text-brand-orange transition-colors float-right"
              >
                Forgot password?
              </button>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
              {/* Unverified email — show resend prompt inline */}
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={() => setView('verify-email')}
                  className="mt-1.5 text-xs font-semibold text-brand-orange hover:underline flex items-center gap-1"
                >
                  <Mail size={11} />
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {loginModalReason !== 'sell' && loginModalReason !== 'ride' && (
          <button
            onClick={handleClose}
            className="w-full mt-3 text-sm text-neutral-600 hover:text-neutral-900 transition-colors text-center"
          >
            Continue browsing as guest
          </button>
        )}

        <p className="text-xs text-neutral-600 text-center mt-4">
          By continuing, you agree to AnyBuy's{' '}
          <a href="/terms" className="text-brand-orange hover:underline">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-brand-orange hover:underline">Privacy Policy</a>
        </p>
      </>
      )}
    </Modal>
  )
}
