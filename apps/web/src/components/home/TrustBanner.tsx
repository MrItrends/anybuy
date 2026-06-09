const TRUST_PILLARS = [
  {
    n: '01',
    label: 'Video Verified',
    body: 'Every listing includes real video proof of the item before you pay.',
  },
  {
    n: '02',
    label: 'Escrow Protected',
    body: 'Your money is held safely until you confirm delivery.',
  },
  {
    n: '03',
    label: 'Tracked Delivery',
    body: 'Partnered logistics with real-time rider tracking on every order.',
  },
  {
    n: '04',
    label: 'Rated Sellers',
    body: 'Verified reviews from real buyers — no fake scores, no ghost shops.',
  },
]

export function TrustBanner() {
  return (
    <section className="bg-brand-dark border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="py-12 lg:py-14 border-b border-white/10">
          <p className="text-brand-orange text-xs font-bold tracking-[0.25em] uppercase mb-3">
            Built on Trust
          </p>
          <h2
            className="font-satoshi font-black text-white tracking-tight max-w-2xl"
            style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)' }}
          >
            What you see is what you receive.
          </h2>
        </div>

        {/* Pillars — numbered, no icon boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/10">
          {TRUST_PILLARS.map(({ n, label, body }) => (
            <div key={n} className="px-6 py-8 lg:px-8 lg:py-10">
              {/* Ghost number */}
              <p
                className="font-satoshi font-black leading-none mb-4 tabular-nums select-none"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  color: 'oklch(0.68 0.22 40 / 0.22)',
                }}
              >
                {n}
              </p>
              <p className="font-satoshi font-bold text-white text-base mb-2">{label}</p>
              <p className="text-white/45 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
