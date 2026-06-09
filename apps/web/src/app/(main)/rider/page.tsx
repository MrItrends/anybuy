'use client'

import { RiderNavbar } from '@/components/layout/RiderNavbar'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { ArrowRight, CheckCircle2, Clock, MapPin, Shield, Star, TrendingUp, Truck } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// ── Data ─────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '500+',  label: 'Active riders',       sub: 'across Nigeria' },
  { value: '10k+',  label: 'Deliveries completed', sub: 'and counting' },
  { value: '4.8',   label: 'Average rider rating', sub: 'out of 5 stars' },
]

const BENEFITS = [
  {
    number: '01',
    heading: 'You set the pace.',
    body: 'Go online when it suits you. Pause whenever. No minimum hours, no penalties for days off. AnyBuy works around your life.',
    icon: Clock,
  },
  {
    number: '02',
    heading: 'Every delivery pays.',
    body: 'Transparent per-delivery earnings, calculated upfront. No surge theatrics. No hidden deductions. What you see is what lands in your account.',
    icon: TrendingUp,
  },
  {
    number: '03',
    heading: 'Close to home.',
    body: 'All deliveries are local. Short hops within your city. No long-haul runs that eat your fuel earnings.',
    icon: MapPin,
  },
  {
    number: '04',
    heading: 'AnyBuy has your back.',
    body: 'Every delivery is tracked and logged. Disputes are handled fairly. You ride; we handle the back-office.',
    icon: Shield,
  },
]

const STEPS = [
  { n: '01', title: 'Create your account',  body: 'Sign up free. Verify your phone, pick your vehicle, add your city.' },
  { n: '02', title: 'Get your first job',   body: 'Our team assigns nearby deliveries based on your location and availability.' },
  { n: '03', title: 'Pick up and deliver',  body: 'Collect from the seller, drop at the buyer. Confirm completion in the app.' },
  { n: '04', title: 'Get paid weekly',      body: 'Earnings stack up. Payouts hit your bank every Friday, no exceptions.' },
]

// ── Reveal hook ───────────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RiderLandingPage() {
  const { user, loading: authLoading, openLoginModal } = useAuthStore()
  const router = useRouter()
  const [checkingProfile, setCheckingProfile] = useState(false)

  // Redirect logged-in riders straight to dashboard
  useEffect(() => {
    if (authLoading) return
    if (user?.role === 'rider') {
      router.replace('/rider/dashboard')
    }
  }, [authLoading, user, router])

  async function handleCTA() {
    if (!user) { openLoginModal('ride'); return }
    setCheckingProfile(true)
    const supabase = createClient()
    const { data } = await supabase.from('rider_profiles').select('user_id').eq('user_id', user.id).maybeSingle()
    setCheckingProfile(false)
    router.push(data ? '/rider/dashboard' : '/rider/onboarding')
  }

  const statsReveal    = useReveal()
  const benefitsReveal = useReveal()
  const stepsReveal    = useReveal()

  return (
    <>
      <RiderNavbar />
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .reveal-child > * {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-child.in > *:nth-child(1) { opacity:1; transform:none; transition-delay:0s; }
        .reveal-child.in > *:nth-child(2) { opacity:1; transform:none; transition-delay:0.08s; }
        .reveal-child.in > *:nth-child(3) { opacity:1; transform:none; transition-delay:0.16s; }
        .reveal-child.in > *:nth-child(4) { opacity:1; transform:none; transition-delay:0.24s; }
        .hero-headline { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .hero-sub      { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .hero-cta      { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
        .hero-img      { animation: fadeIn 1s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative bg-neutral-950 overflow-hidden"
        style={{ minHeight: '100svh' }}
      >
        {/* Faint grid texture */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(oklch(1 0.005 60) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0.005 60) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Orange glow behind rider */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 70% at 80% 50%, oklch(0.65 0.22 40 / 0.18) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 flex flex-col lg:flex-row items-center" style={{ minHeight: '100svh' }}>

          {/* Left: copy */}
          <div className="flex-1 pt-24 pb-12 lg:py-0 lg:pr-10 z-10">
            {/* Pill */}
            <div className="hero-headline inline-flex items-center gap-2 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-brand-orange text-sm font-semibold tracking-wide uppercase">Hiring riders across Nigeria</span>
            </div>

            {/* Headline */}
            <h1 className="hero-headline font-satoshi font-black text-white leading-[0.93] tracking-tight"
              style={{ fontSize: 'clamp(3.5rem, 8vw, 6.5rem)' }}>
              Deliver.<br />
              Earn.<br />
              <span style={{ color: 'oklch(0.68 0.22 40)' }}>Repeat.</span>
            </h1>

            <p className="hero-sub mt-8 text-white/60 leading-relaxed max-w-md"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)' }}>
              Join AnyBuy's rider network. Flexible hours, local routes, weekly payouts directly to your bank.
            </p>

            {/* CTA row */}
            <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={handleCTA}
                disabled={checkingProfile}
                className="group inline-flex items-center gap-3 bg-brand-orange hover:bg-[#ea6c10] disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200"
                style={{ padding: 'clamp(0.9rem, 2vw, 1.1rem) clamp(1.8rem, 3vw, 2.5rem)', fontSize: 'clamp(1rem, 1.5vw, 1.1rem)' }}
              >
                {checkingProfile ? 'Loading…' : 'Start earning today'}
                <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <p className="text-white/30 text-sm">Free to join. No commitment.</p>
            </div>

            {/* Quick trust row */}
            <div className="hero-cta mt-12 flex items-center gap-6 flex-wrap">
              {[
                'Weekly payouts',
                'Local deliveries only',
                'Cancel anytime',
              ].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-white/50 text-sm">
                  <CheckCircle2 size={13} className="text-brand-orange flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right: rider photo */}
          <div className="hero-img relative flex-shrink-0 w-full lg:w-[48%] flex items-end justify-center lg:justify-end self-end lg:self-stretch">
            <div className="relative w-full flex items-end justify-center lg:justify-end" style={{ height: 'clamp(420px, 65vh, 780px)' }}>
              <Image
                src="/rider-hero.webp"
                alt="AnyBuy rider on a motorcycle, checking their phone"
                fill
                className="object-contain object-bottom"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

        </div>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.14 0.008 40))' }} />
      </section>

      {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
      <section style={{ background: 'oklch(0.14 0.008 40)' }}>
        <div
          ref={statsReveal.ref}
          className={`reveal-child ${statsReveal.visible ? 'in' : ''} max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x`}
          style={{ borderColor: 'oklch(1 0 0 / 0.07)' }}
        >
          {STATS.map(({ value, label, sub }) => (
            <div key={label} className="sm:px-12 first:pl-0 last:pr-0 text-center sm:text-left">
              <p className="font-satoshi font-black text-brand-orange leading-none"
                style={{ fontSize: 'clamp(2.8rem, 5vw, 4rem)' }}>
                {value}
              </p>
              <p className="text-white font-semibold mt-1" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>{label}</p>
              <p className="text-white/35 text-sm mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">

          <div className="mb-20">
            <p className="text-brand-orange text-sm font-bold uppercase tracking-widest mb-3">Why AnyBuy</p>
            <h2 className="font-satoshi font-black text-neutral-900 leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
              Built for riders<br />who take it seriously.
            </h2>
          </div>

          <div
            ref={benefitsReveal.ref}
            className={`reveal-child ${benefitsReveal.visible ? 'in' : ''} grid grid-cols-1 lg:grid-cols-2 gap-px`}
            style={{ background: 'oklch(0.93 0.005 60)' }}
          >
            {BENEFITS.map(({ number, heading, body, icon: Icon }) => (
              <div key={number} className="bg-white p-10 lg:p-14 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <span className="font-satoshi font-black text-neutral-200 leading-none select-none"
                    style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}>
                    {number}
                  </span>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'oklch(0.68 0.22 40 / 0.1)' }}>
                    <Icon size={20} className="text-brand-orange" />
                  </div>
                </div>
                <div>
                  <h3 className="font-satoshi font-black text-neutral-900 mb-3"
                    style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)' }}>
                    {heading}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed" style={{ fontSize: '1rem', maxWidth: '38ch' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ background: 'oklch(0.11 0.008 40)' }} className="py-28 px-6 lg:px-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">

          <div className="mb-16">
            <p className="text-brand-orange text-sm font-bold uppercase tracking-widest mb-3">The process</p>
            <h2 className="font-satoshi font-black text-white leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
              From sign-up to<br />first payday.
            </h2>
          </div>

          <div
            ref={stepsReveal.ref}
            className={`reveal-child ${stepsReveal.visible ? 'in' : ''} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`}
          >
            {STEPS.map(({ n, title, body }, i) => (
              <div key={n} className="relative rounded-2xl p-8 overflow-hidden"
                style={{ background: 'oklch(0.17 0.01 40)' }}>
                {/* Step number as texture */}
                <span className="absolute -top-4 -right-3 font-satoshi font-black select-none pointer-events-none leading-none"
                  style={{ fontSize: '6rem', color: 'oklch(1 0 0 / 0.04)' }}>
                  {n}
                </span>

                {/* Step indicator */}
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-7 h-7 rounded-full bg-brand-orange flex items-center justify-center flex-shrink-0">
                    <span className="font-satoshi font-black text-white text-xs">{i + 1}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px" style={{ background: 'oklch(1 0 0 / 0.08)' }} />
                  )}
                </div>

                <h3 className="font-satoshi font-bold text-white mb-3" style={{ fontSize: '1.1rem' }}>{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARNINGS SPOTLIGHT ───────────────────────────────────────────── */}
      <section className="bg-brand-orange py-24 px-6 lg:px-10 overflow-hidden relative">
        {/* Decorative large text behind */}
        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-satoshi font-black leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(8rem, 18vw, 14rem)', color: 'oklch(0 0 0 / 0.07)' }}>
          ₦₦₦
        </span>

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl">
            <p className="text-black/50 text-sm font-bold uppercase tracking-widest mb-4">Your earning potential</p>
            <h2 className="font-satoshi font-black text-neutral-950 leading-tight mb-6"
              style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)' }}>
              Riders in Lagos average<br />
              <span className="underline decoration-wavy decoration-black/20">₦35,000 per month.</span>
            </h2>
            <p className="text-black/60 leading-relaxed mb-10" style={{ maxWidth: '40ch', fontSize: '1.05rem' }}>
              Top riders who stay active 5 days a week earn above ₦60,000. Your effort sets your ceiling.
            </p>
            <button
              onClick={handleCTA}
              disabled={checkingProfile}
              className="inline-flex items-center gap-3 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200"
              style={{ padding: '1rem 2.2rem', fontSize: '1.05rem' }}
            >
              {checkingProfile ? 'Loading…' : 'Start earning'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ─────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-neutral-100 py-14 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <p className="font-satoshi font-black text-neutral-900 text-center sm:text-left"
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)' }}>
            Ready to ride with AnyBuy?
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="text-brand-orange fill-brand-orange" />
              ))}
              <span className="text-neutral-500 text-sm ml-2">4.8 from 200+ riders</span>
            </div>
            <button
              onClick={handleCTA}
              disabled={checkingProfile}
              className="group inline-flex items-center gap-2.5 bg-brand-orange hover:bg-[#ea6c10] disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200 px-8 py-3.5"
            >
              {checkingProfile ? 'Loading…' : 'Apply now'}
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
