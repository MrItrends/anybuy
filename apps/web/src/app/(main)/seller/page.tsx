'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import {
  ArrowRight, CheckCircle2, Clock, ShieldCheck,
  Star, TrendingUp, Video, Wallet,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '8,000+', label: 'Active buyers',        sub: 'ready to shop now' },
  { value: '2 min',  label: 'Time to go live',       sub: 'list and sell immediately' },
  { value: '5%',     label: 'Flat fee per sale',     sub: 'no listing cost, ever' },
]

const BENEFITS = [
  {
    number: '01',
    heading: 'List in two minutes.',
    body: 'Upload photos, set your price, write a quick description. Your item is live on the marketplace instantly — no approval queue.',
    icon: Clock,
  },
  {
    number: '02',
    heading: 'Go live and sell faster.',
    body: 'Jump on camera to demonstrate your item in real time. Buyers bid, ask questions, and buy — all in one session. Live sellers move stock 3× faster.',
    icon: Video,
  },
  {
    number: '03',
    heading: 'Escrow keeps you safe.',
    body: "Buyers pay before delivery. AnyBuy holds the funds in escrow until the buyer confirms receipt — so you're always protected from chargebacks and fraud.",
    icon: ShieldCheck,
  },
  {
    number: '04',
    heading: 'Get paid every week.',
    body: 'Confirmed sales stack up and hit your bank account every Friday. No complicated withdrawal flows. No minimum threshold.',
    icon: Wallet,
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Create your store',
    body: 'Pick a store name, add your phone number, and you are live in under a minute. Free to join.',
  },
  {
    n: '02',
    title: 'List or go live',
    body: 'Add items with photos and prices, or start a live session to demonstrate and auction in real time.',
  },
  {
    n: '03',
    title: 'Buyer pays into escrow',
    body: 'AnyBuy holds the payment safely. Ship the item using our partnered logistics or your preferred courier.',
  },
  {
    n: '04',
    title: 'Delivery confirmed, you get paid',
    body: "Once the buyer confirms they received the item, funds release to your account within 24 hours.",
  },
]

// ── Reveal hook ───────────────────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SellerLandingPage() {
  const { user, openLoginModal } = useAuthStore()
  const router = useRouter()
  const [checkingProfile, setCheckingProfile] = useState(false)

  async function handleCTA() {
    if (!user) { openLoginModal('sell'); return }
    setCheckingProfile(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('seller_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    setCheckingProfile(false)
    router.push(data ? '/seller/dashboard' : '/sell')
  }

  const statsReveal    = useReveal()
  const benefitsReveal = useReveal()
  const stepsReveal    = useReveal()

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .seller-reveal-child > * {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .seller-reveal-child.in > *:nth-child(1) { opacity:1; transform:none; transition-delay:0s; }
        .seller-reveal-child.in > *:nth-child(2) { opacity:1; transform:none; transition-delay:0.08s; }
        .seller-reveal-child.in > *:nth-child(3) { opacity:1; transform:none; transition-delay:0.16s; }
        .seller-reveal-child.in > *:nth-child(4) { opacity:1; transform:none; transition-delay:0.24s; }
        .seller-hero-headline { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .seller-hero-sub      { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .seller-hero-cta      { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
      `}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="relative bg-neutral-950 overflow-hidden"
        style={{ minHeight: '92svh' }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(oklch(1 0.005 60) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0.005 60) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Orange glow — top left, suggesting a warm marketplace energy */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2/3 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 65% at 10% 30%, oklch(0.65 0.22 40 / 0.14) 0%, transparent 65%)',
          }}
        />

        {/* Large ghost ₦ symbol */}
        <span
          className="absolute right-8 bottom-0 font-satoshi font-black leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(16rem, 30vw, 28rem)', color: 'oklch(1 0 0 / 0.025)' }}
          aria-hidden
        >
          ₦
        </span>

        <div
          className="relative max-w-7xl mx-auto px-6 lg:px-10 flex flex-col justify-center"
          style={{ minHeight: '92svh' }}
        >
          <div className="max-w-3xl py-24 lg:py-0">
            {/* Pill */}
            <div className="seller-hero-headline inline-flex items-center gap-2 mb-8">
              <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-brand-orange text-sm font-semibold tracking-wide uppercase">
                Sell on AnyBuy — Lagos, Abuja, Port Harcourt
              </span>
            </div>

            {/* Headline */}
            <h1
              className="seller-hero-headline font-satoshi font-black text-white leading-[0.93] tracking-tight"
              style={{ fontSize: 'clamp(3.2rem, 7.5vw, 6rem)' }}
            >
              Your hustle.<br />
              Your price.<br />
              <span style={{ color: 'oklch(0.68 0.22 40)' }}>Sell anything.</span>
            </h1>

            <p
              className="seller-hero-sub mt-8 text-white/60 leading-relaxed max-w-lg"
              style={{ fontSize: 'clamp(1rem, 1.8vw, 1.2rem)' }}
            >
              Turn your unused items into cash. List in two minutes, go live to sell faster,
              and get paid weekly — all backed by AnyBuy escrow.
            </p>

            {/* CTA row */}
            <div className="seller-hero-cta mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={handleCTA}
                disabled={checkingProfile}
                className="group inline-flex items-center gap-3 bg-brand-orange hover:bg-[#ea6c10] disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200"
                style={{
                  padding: 'clamp(0.9rem, 2vw, 1.1rem) clamp(1.8rem, 3vw, 2.5rem)',
                  fontSize: 'clamp(1rem, 1.5vw, 1.1rem)',
                }}
              >
                {checkingProfile ? 'Loading…' : 'Start selling for free'}
                <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <p className="text-white/30 text-sm">No listing fees. 5% only on successful sales.</p>
            </div>

            {/* Quick trust row */}
            <div className="seller-hero-cta mt-12 flex items-center gap-6 flex-wrap">
              {['Free to join', 'Weekly payouts', 'Escrow on every sale'].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-white/50 text-sm">
                  <CheckCircle2 size={13} className="text-brand-orange flex-shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, oklch(0.14 0.008 40))' }}
        />
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <section style={{ background: 'oklch(0.14 0.008 40)' }}>
        <div
          ref={statsReveal.ref}
          className={`seller-reveal-child ${statsReveal.visible ? 'in' : ''} max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x`}
          style={{ borderColor: 'oklch(1 0 0 / 0.07)' }}
        >
          {STATS.map(({ value, label, sub }) => (
            <div key={label} className="sm:px-12 first:pl-0 last:pr-0 text-center sm:text-left">
              <p
                className="font-satoshi font-black text-brand-orange leading-none"
                style={{ fontSize: 'clamp(2.8rem, 5vw, 4rem)' }}
              >
                {value}
              </p>
              <p className="text-white font-semibold mt-1" style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>
                {label}
              </p>
              <p className="text-white/35 text-sm mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-28 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <p className="text-brand-orange text-sm font-bold uppercase tracking-widest mb-3">Why sell here</p>
            <h2
              className="font-satoshi font-black text-neutral-900 leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}
            >
              Built for sellers<br />who mean business.
            </h2>
          </div>

          <div
            ref={benefitsReveal.ref}
            className={`seller-reveal-child ${benefitsReveal.visible ? 'in' : ''} grid grid-cols-1 lg:grid-cols-2 gap-px`}
            style={{ background: 'oklch(0.93 0.005 60)' }}
          >
            {BENEFITS.map(({ number, heading, body, icon: Icon }) => (
              <div key={number} className="bg-white p-10 lg:p-14 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <span
                    className="font-satoshi font-black text-neutral-200 leading-none select-none"
                    style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
                  >
                    {number}
                  </span>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'oklch(0.68 0.22 40 / 0.1)' }}
                  >
                    <Icon size={20} className="text-brand-orange" />
                  </div>
                </div>
                <div>
                  <h3
                    className="font-satoshi font-black text-neutral-900 mb-3"
                    style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)' }}
                  >
                    {heading}
                  </h3>
                  <p className="text-neutral-500 leading-relaxed text-base" style={{ maxWidth: '38ch' }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section style={{ background: 'oklch(0.11 0.008 40)' }} className="py-28 px-6 lg:px-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-brand-orange text-sm font-bold uppercase tracking-widest mb-3">The process</p>
            <h2
              className="font-satoshi font-black text-white leading-tight"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}
            >
              From sign-up to<br />first sale.
            </h2>
          </div>

          <div
            ref={stepsReveal.ref}
            className={`seller-reveal-child ${stepsReveal.visible ? 'in' : ''} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`}
          >
            {STEPS.map(({ n, title, body }, i) => (
              <div
                key={n}
                className="relative rounded-2xl p-8 overflow-hidden"
                style={{ background: 'oklch(0.17 0.01 40)' }}
              >
                {/* Ghost step number */}
                <span
                  className="absolute -top-4 -right-3 font-satoshi font-black select-none pointer-events-none leading-none"
                  style={{ fontSize: '6rem', color: 'oklch(1 0 0 / 0.04)' }}
                >
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

                <h3 className="font-satoshi font-bold text-white mb-3" style={{ fontSize: '1.1rem' }}>
                  {title}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EARNINGS SPOTLIGHT ────────────────────────────────────────────── */}
      <section className="bg-brand-orange py-24 px-6 lg:px-10 overflow-hidden relative">
        {/* Ghost ₦ sign */}
        <span
          className="absolute right-6 top-1/2 -translate-y-1/2 font-satoshi font-black leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(8rem, 18vw, 14rem)', color: 'oklch(0 0 0 / 0.07)' }}
          aria-hidden
        >
          ₦₦₦
        </span>

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-2xl">
            <p className="text-black/50 text-sm font-bold uppercase tracking-widest mb-4">
              Your earning potential
            </p>
            <h2
              className="font-satoshi font-black text-neutral-950 leading-tight mb-6"
              style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)' }}
            >
              Sellers on AnyBuy average<br />
              <span className="underline decoration-wavy decoration-black/20">
                ₦120,000 in their first month.
              </span>
            </h2>
            <p className="text-black/60 leading-relaxed mb-10" style={{ maxWidth: '40ch', fontSize: '1.05rem' }}>
              Top sellers who combine listings with live sessions regularly clear ₦500,000.
              Your inventory sets the floor; your hustle sets the ceiling.
            </p>
            <button
              onClick={handleCTA}
              disabled={checkingProfile}
              className="inline-flex items-center gap-3 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200"
              style={{ padding: '1rem 2.2rem', fontSize: '1.05rem' }}
            >
              {checkingProfile ? 'Loading…' : 'Start selling'}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-neutral-100 py-14 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
          <p
            className="font-satoshi font-black text-neutral-900 text-center sm:text-left"
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)' }}
          >
            Ready to sell on AnyBuy?
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="text-brand-orange fill-brand-orange" />
              ))}
              <span className="text-neutral-500 text-sm ml-2">4.7 from 800+ sellers</span>
            </div>
            <button
              onClick={handleCTA}
              disabled={checkingProfile}
              className="group inline-flex items-center gap-2.5 bg-brand-orange hover:bg-[#ea6c10] disabled:opacity-60 text-white font-bold rounded-2xl transition-all duration-200 px-8 py-3.5"
            >
              {checkingProfile ? 'Loading…' : 'Open your store'}
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
