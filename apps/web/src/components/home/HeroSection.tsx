'use client'

import { Button } from '@/components/ui'
import { BadgeCheck, CheckCircle2, ShieldCheck, Star, TrendingUp, Zap } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const FEATURED_PRODUCTS = [
  {
    id: '1',
    title: 'iPhone 14 Pro Max',
    price: '₦850,000',
    condition: 'Grade A',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=300&fit=crop',
    seller: 'Adaeze O.',
    rating: 4.8,
  },
  {
    id: '2',
    title: 'Nike Air Force 1',
    price: '₦45,000',
    condition: 'Grade A',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
    seller: 'Tunde A.',
    rating: 4.5,
  },
  {
    id: '3',
    title: 'Sony WH-1000XM5',
    price: '₦95,000',
    condition: 'Grade B',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    seller: 'SoundWave NG',
    rating: 4.9,
  },
]

export function HeroSection() {
  return (
    <>
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .h-pill    { animation: heroFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .h-title   { animation: heroFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .h-body    { animation: heroFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.26s both; }
        .h-cta     { animation: heroFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.36s both; }
        .h-trust   { animation: heroFadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
        .h-img     { animation: heroFadeIn 1s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
      `}</style>

      <section className="bg-brand-dark relative overflow-hidden">
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(oklch(1 0.005 60) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0.005 60) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Warm orange ambient glow — right side */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 70% at 80% 45%, oklch(0.65 0.22 40 / 0.15) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* ── Left: copy ───────────────────────────────────────────── */}
            <div className="max-w-xl">

              {/* Eyebrow — rider-style orange dot + text */}
              <div className="h-pill inline-flex items-center gap-2 mb-8">
                <span className="flex h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
                <span className="text-brand-orange text-sm font-semibold tracking-wide uppercase">
                  Africa's most trusted marketplace
                </span>
              </div>

              {/* Headline — bold, fluid, tight */}
              <h1
                className="h-title font-satoshi font-black text-white leading-[0.93] tracking-tight mb-8"
                style={{ fontSize: 'clamp(3.2rem, 7vw, 5.5rem)' }}
              >
                See it.{' '}
                <span style={{ color: 'oklch(0.68 0.22 40)' }}>Love it.</span>
                <br />
                Own it.
              </h1>

              <p
                className="h-body text-white/60 leading-relaxed max-w-md mb-10"
                style={{ fontSize: 'clamp(1rem, 1.6vw, 1.15rem)' }}
              >
                Buy and sell quality secondhand items with verified listings,
                live demos, and secure escrow payments.
              </p>

              {/* CTA */}
              <div className="h-cta">
                <Link href="/search">
                  <Button size="lg" className="gap-2 !rounded-2xl">
                    <Zap size={16} />
                    Browse listings
                  </Button>
                </Link>
              </div>

              {/* Inline trust signals — rider-style with CheckCircle2 */}
              <div className="h-trust mt-10 flex flex-wrap items-center gap-x-6 gap-y-2">
                {[
                  '12,000+ active listings',
                  'Verified sellers',
                  'Escrow on every transaction',
                ].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-white/50 text-sm">
                    <CheckCircle2 size={13} className="text-brand-orange flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: floating product card composition ──────────────── */}
            <div className="h-img relative h-[520px] hidden lg:block">

              {/* Decorative rings */}
              <div className="absolute top-8 left-1/2 -translate-x-1/4 w-60 h-60 rounded-full border border-white/10 z-0" />
              <div className="absolute top-4 left-1/2 -translate-x-1/4 w-72 h-72 rounded-full border border-white/5 z-0" />

              {/* Main product card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/4 w-56 bg-white rounded-3xl shadow-2xl overflow-hidden z-20 rotate-2">
                <div className="relative h-44 bg-neutral-100">
                  <Image
                    src={FEATURED_PRODUCTS[0].image}
                    alt={FEATURED_PRODUCTS[0].title}
                    fill
                    sizes="224px"
                    className="object-cover"
                  />
                  <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/90 text-white backdrop-blur-sm">
                    {FEATURED_PRODUCTS[0].condition}
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="font-satoshi font-bold text-neutral-900 text-sm">{FEATURED_PRODUCTS[0].title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-brand-orange font-bold text-base">{FEATURED_PRODUCTS[0].price}</span>
                    <div className="flex items-center gap-0.5">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      <span className="text-xs text-neutral-500">{FEATURED_PRODUCTS[0].rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <BadgeCheck size={12} className="text-brand-green" />
                    <span className="text-xs text-neutral-500">{FEATURED_PRODUCTS[0].seller}</span>
                  </div>
                </div>
              </div>

              {/* Second product card */}
              <div className="absolute top-16 left-0 w-48 bg-white rounded-3xl shadow-xl overflow-hidden z-10 -rotate-3">
                <div className="relative h-36 bg-neutral-100">
                  <Image
                    src={FEATURED_PRODUCTS[1].image}
                    alt={FEATURED_PRODUCTS[1].title}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                  <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/90 text-white">
                    {FEATURED_PRODUCTS[1].condition}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-satoshi font-bold text-neutral-900 text-xs">{FEATURED_PRODUCTS[1].title}</p>
                  <span className="text-brand-orange font-bold text-sm">{FEATURED_PRODUCTS[1].price}</span>
                </div>
              </div>

              {/* Third product card */}
              <div className="absolute bottom-10 right-0 w-48 bg-white rounded-3xl shadow-xl overflow-hidden z-10 rotate-1">
                <div className="relative h-36 bg-neutral-100">
                  <Image
                    src={FEATURED_PRODUCTS[2].image}
                    alt={FEATURED_PRODUCTS[2].title}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                  <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/90 text-white">
                    {FEATURED_PRODUCTS[2].condition}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-satoshi font-bold text-neutral-900 text-xs">{FEATURED_PRODUCTS[2].title}</p>
                  <span className="text-brand-orange font-bold text-sm">{FEATURED_PRODUCTS[2].price}</span>
                </div>
              </div>

              {/* LIVE watcher badge */}
              <div className="absolute top-4 right-4 z-30 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face"
                      alt="Live seller"
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div>
                  <p className="text-neutral-900 font-bold text-xs">GadgetHub NG</p>
                  <p className="text-neutral-500 text-xs">217 watching</p>
                </div>
              </div>

              {/* Escrow protected pill */}
              <div className="absolute bottom-32 left-2 z-30 bg-brand-dark rounded-2xl shadow-xl px-4 py-3 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-green/20 flex items-center justify-center">
                  <ShieldCheck size={16} className="text-brand-green" />
                </div>
                <div>
                  <p className="text-white font-bold text-xs">Escrow Protected</p>
                  <p className="text-white/50 text-xs">Pay only on delivery</p>
                </div>
              </div>

              {/* New listing notification */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 w-64">
                <div className="w-8 h-8 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={15} className="text-brand-orange" />
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-900 font-bold text-xs">MacBook Air M2 listed</p>
                  <p className="text-neutral-500 text-xs">Just now · ₦1,100,000</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-brand-green flex-shrink-0 animate-pulse" />
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  )
}
