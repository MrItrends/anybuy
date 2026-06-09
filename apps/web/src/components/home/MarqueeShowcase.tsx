'use client'

import Link from 'next/link'

// ── Holiday ad banner cards ─────────────────────────────────────────────────
// Each card: 400 × 280px landscape. Duplicated for seamless infinite scroll.

function BlackFridayCard() {
  return (
    <Link href="/search?sort=deals&occasion=black_friday"
      className="relative flex-shrink-0 w-[400px] h-[280px] rounded-2xl overflow-hidden bg-black group cursor-pointer">
      {/* Diagonal grid texture */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '24px 24px' }} />
      {/* Orange accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
      {/* Right glow */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-brand-orange/20 blur-3xl" />

      <div className="relative z-10 h-full flex p-7">
        {/* Left: text */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <span className="inline-block text-brand-orange text-[9px] font-black tracking-[0.3em] uppercase mb-2">
              Biggest Sale of the Year
            </span>
            <p className="font-satoshi font-black text-white text-5xl leading-none">BLACK</p>
            <p className="font-satoshi font-black leading-none" style={{ fontSize: '3.5rem', WebkitTextStroke: '2px #FF6A3D', color: 'transparent' }}>
              FRIDAY
            </p>
          </div>
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-widest">Deals start</p>
            <p className="text-white font-bold text-sm">Nov 27 — Dec 1, 2026</p>
          </div>
        </div>

        {/* Right: discount badge */}
        <div className="flex flex-col items-end justify-between">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full">
              <polygon points="40,3 47,26 72,24 54,40 63,64 40,51 17,64 26,40 8,24 33,26"
                fill="#FF6A3D" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-black text-base leading-none">70%</span>
              <span className="text-white font-black text-[9px] leading-none">OFF</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[9px] tracking-widest uppercase">Shop now →</p>
          </div>
        </div>
      </div>

      {/* Hover lift */}
      <div className="absolute inset-0 ring-1 ring-brand-orange/0 group-hover:ring-brand-orange/60 rounded-2xl transition-all duration-300" />
    </Link>
  )
}

function RamadanCard() {
  return (
    <Link href="/category/all?occasion=ramadan"
      className="relative flex-shrink-0 w-[400px] h-[280px] rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #0F0A2A 0%, #1E1060 50%, #0F0A2A 100%)' }}>
      {/* Star field */}
      {[
        [12,18],[55,28],[30,60],[80,15],[95,45],[70,70],[20,80],[45,10],
        [88,32],[62,55],[10,50],[38,85],[75,8]
      ].map(([x,y], i) => (
        <div key={i} className="absolute rounded-full bg-yellow-200"
          style={{ left: `${x}%`, top: `${y}%`, width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, opacity: 0.6 + (i % 4) * 0.1 }} />
      ))}
      {/* Moon + lantern glow */}
      <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)' }} />

      {/* Crescent SVG */}
      <div className="absolute top-5 right-8">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <path d="M38 10C26 10 16 19 16 30C16 41 26 50 38 50C32 50 26 46 26 39C26 32 31 27 38 27C41 27 44 28 46 30C44 22 41 14 38 10Z"
            fill="#FBBF24" opacity="0.9" />
          {/* Small star next to moon */}
          <path d="M46 16 L48 22 L54 22 L49 26 L51 32 L46 28 L41 32 L43 26 L38 22 L44 22Z"
            fill="#FBBF24" opacity="0.7" transform="scale(0.55) translate(44,10)" />
        </svg>
      </div>

      {/* Lanterns */}
      <div className="absolute top-3 left-8 text-2xl" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.8))' }}>🏮</div>
      <div className="absolute top-3 right-20 text-xl opacity-60">🏮</div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-7">
        <div>
          <span className="text-yellow-300/80 text-[9px] font-bold tracking-[0.3em] uppercase">Holy Month Deals · Feb 2027</span>
          <p className="font-satoshi font-black text-white text-4xl leading-tight mt-1">Ramadan</p>
          <p className="font-satoshi font-black leading-none mt-0.5"
            style={{ fontSize: '2.8rem', color: '#FBBF24', textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
            Kareem ✦
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-yellow-200/60 text-[11px] uppercase tracking-widest">Blessed savings</p>
            <p className="text-yellow-300 font-black text-2xl leading-none">Up to 50% off</p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <span className="text-2xl">🌙</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EidAdhaCard() {
  return (
    <Link href="/category/all?occasion=eid_adha"
      className="relative flex-shrink-0 w-[400px] h-[280px] rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #022C22 0%, #064E3B 60%, #065F46 100%)' }}>
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'repeating-conic-gradient(#fff 0deg 15deg, transparent 0deg 30deg)', backgroundSize: '40px 40px' }} />
      {/* Gold glow top-right */}
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)' }} />
      {/* Green light bottom-left */}
      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-emerald-400/10 blur-2xl" />

      <div className="relative z-10 h-full flex flex-col justify-between p-7">
        <div>
          <span className="text-emerald-300/70 text-[9px] font-bold tracking-[0.3em] uppercase">Festival of Sacrifice · May 27, 2026</span>
          <div className="flex items-center gap-2 mt-1">
            {/* Crescent star */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M19 5C13 5 8 9.5 8 15C8 20.5 13 25 19 25C16 25 13 23 13 19C13 16 15.5 13.5 19 13.5C20.5 13.5 22 14 23 15C22 11 21 7 19 5Z" fill="#FBBF24"/>
              <polygon points="23,2 24,6 28,6 25,8 26,12 23,10 20,12 21,8 18,6 22,6" fill="#FBBF24" transform="scale(0.4) translate(33,2)"/>
            </svg>
            <p className="font-satoshi font-black text-white text-4xl leading-none">Eid</p>
          </div>
          <p className="font-satoshi font-black text-4xl leading-none mt-0.5"
            style={{ color: '#6EE7B7', textShadow: '0 0 16px rgba(110,231,183,0.4)' }}>
            Al-Adha ✦
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white font-black text-2xl">Mubarak 🕌</p>
            <p className="text-emerald-300/80 text-xs mt-0.5">Exclusive Eid collection — Up to 55% off</p>
          </div>
        </div>
      </div>

      {/* Side accent */}
      <div className="absolute right-0 top-0 bottom-0 w-1.5 rounded-r-2xl"
        style={{ background: 'linear-gradient(to bottom, #FBBF24, #6EE7B7)' }} />
    </Link>
  )
}

function ChristmasCard() {
  return (
    <Link href="/category/all?occasion=christmas"
      className="relative flex-shrink-0 w-[400px] h-[280px] rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: 'linear-gradient(135deg, #7B0000 0%, #450A0A 50%, #1C0A0A 100%)' }}>
      {/* Snowflake scatter */}
      {['❄','✦','❅','✦','❄','❅'].map((s, i) => (
        <div key={i} className="absolute text-white select-none pointer-events-none"
          style={{
            left: `${[8,22,55,70,85,40][i]}%`,
            top: `${[10,65,8,72,20,40][i]}%`,
            fontSize: [16,10,20,12,14,8][i],
            opacity: [0.3,0.2,0.4,0.25,0.35,0.2][i],
          }}>{s}</div>
      ))}
      {/* Green top accent */}
      <div className="absolute top-0 left-0 w-full h-1.5"
        style={{ background: 'linear-gradient(to right, #15803D, #22C55E, #15803D)' }} />
      {/* Glow */}
      <div className="absolute -left-8 top-0 w-32 h-32 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)' }} />

      <div className="relative z-10 h-full flex flex-col justify-between p-7">
        <div>
          <span className="text-green-400/80 text-[9px] font-bold tracking-[0.3em] uppercase">Season's Greetings</span>
          <p className="font-satoshi font-black text-white text-5xl leading-none mt-1">Merry</p>
          <p className="font-satoshi font-black leading-none"
            style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #FCA5A5, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Christmas 🎄
          </p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-[11px] uppercase tracking-widest">Festive season</p>
            <p className="text-white font-black text-2xl leading-none">60% Off 🎁</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[9px] tracking-widest uppercase">Dec 25, 2026</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function IndependenceDayCard() {
  return (
    <Link href="/category/all?occasion=independence_day"
      className="relative flex-shrink-0 w-[400px] h-[280px] rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: '#008751' }}>
      {/* Nigerian flag reference — white center stripe */}
      <div className="absolute inset-0 flex">
        <div className="w-[38%] bg-[#008751]" />
        <div className="w-[24%] bg-white/15" />
        <div className="w-[38%] bg-[#008751]" />
      </div>
      {/* Subtle pattern */}
      <div className="absolute inset-0 opacity-[0.05]"
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      {/* Top gold band */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]" />
      {/* Eagle silhouette / shield */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
        <svg width="100" height="100" viewBox="0 0 100 100" fill="white">
          <path d="M50 10 L60 30 L80 25 L70 45 L85 55 L65 55 L60 75 L50 60 L40 75 L35 55 L15 55 L30 45 L20 25 L40 30 Z"/>
        </svg>
      </div>

      <div className="relative z-10 h-full flex flex-col justify-between p-7">
        <div>
          <span className="text-white/70 text-[9px] font-bold tracking-[0.3em] uppercase">🇳🇬 October 1st, 2026</span>
          <p className="font-satoshi font-black text-white text-2xl leading-tight mt-1">Happy</p>
          <p className="font-satoshi font-black text-white leading-none"
            style={{ fontSize: '2rem', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            Independence Day
          </p>
          <p className="font-satoshi font-black text-[#F59E0B] text-lg leading-tight">Nigeria 🦅</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/60 text-[11px] uppercase tracking-widest">Naija Celebration Sale</p>
            <p className="text-white font-black text-2xl leading-none">Up to 65% Off 🎉</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Card slot width = 400px card + 24px gap = 424px per slot
// 5 slots × 424 = 2120px per set → total track = 4240px → -50% = -2120px (seamless)
const CARD_SLOT = 424 // px — card (400) + gap (24)
const CARDS = [BlackFridayCard, RamadanCard, EidAdhaCard, ChristmasCard, IndependenceDayCard]

// ── Main component ──────────────────────────────────────────────────────────
export function MarqueeShowcase() {
  // Duplicate for seamless infinite loop: [A,B,C,D,E, A,B,C,D,E]
  const doubled = [...CARDS, ...CARDS]

  return (
    <section className="bg-[#080f10] py-20 overflow-hidden">
      {/* Inject keyframes — fixed-pixel offset so the loop is frame-perfect */}
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0px); }
          100% { transform: translateX(-${CARDS.length * CARD_SLOT}px); }
        }
        .marquee-track {
          animation: marquee-scroll 38s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Heading */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <p className="text-brand-orange text-xs font-bold tracking-[0.25em] uppercase mb-3">
          One platform · Infinite possibilities
        </p>
        <h2 className="font-satoshi text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight">
          Every season,<br />every reason to save.
        </h2>
        <p className="text-white/40 mt-4 text-sm max-w-sm mx-auto leading-relaxed">
          Exclusive holiday deals — from Black Friday to Sallah. Always on AnyBuy.
        </p>
      </div>

      {/* Infinite marquee strip */}
      <div className="overflow-hidden pl-6">
        <div className="marquee-track flex" style={{ width: 'max-content' }}>
          {doubled.map((Card, i) => (
            // Each slot is exactly CARD_SLOT px wide: card 400px + right-margin 24px
            <div key={i} className="flex-shrink-0" style={{ marginRight: 24 }}>
              <Card />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
