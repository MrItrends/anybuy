import { cn } from '@/lib/cn'

interface LogoProps {
  /** 'light' = white text (for dark backgrounds), 'dark' = dark text (for light backgrounds) */
  variant?: 'light' | 'dark'
  showTagline?: boolean
  className?: string
  /** Controls overall size — default 130 */
  width?: number
}

/**
 * AnyBuy logo — SVG inline recreation matching the brand identity.
 * Swap for <Image src="/logo.png"> once the PNG is placed in /public.
 */
export function Logo({ variant = 'light', showTagline = false, className, width = 130 }: LogoProps) {
  const letterColor  = variant === 'light' ? '#ffffff' : '#0E2A2B'
  const letterStroke = variant === 'light' ? '#ffffff' : '#0E2A2B'
  const h = Math.round(width * 0.29)   // icon height
  const th = Math.round(width * 0.32)  // text height

  return (
    <span className={cn('inline-flex flex-col items-start', className)}>
      <span className="inline-flex items-center" style={{ gap: Math.round(width * 0.025) }}>

        {/* ── Orange A icon ── */}
        <svg width={h} height={h} viewBox="0 0 44 44" fill="none" aria-hidden>
          {/* Main A triangle */}
          <path d="M22 3 L40 40 H4 Z" fill="#FF6A3D" />
          {/* Crossbar notch (white cutout) */}
          <rect x="10" y="27" width="24" height="6" rx="1.5" fill="white" />
          {/* Orange dot accent — bottom-left of A */}
          <circle cx="9.5" cy="37" r="5.5" fill="#FF6A3D" />
          {/* Slight inner shadow on dot for depth */}
          <circle cx="9.5" cy="37" r="5.5" fill="url(#dotShade)" />
          <defs>
            <radialGradient id="dotShade" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
        </svg>

        {/* ── "nyBuy" wordmark ── */}
        {/*
          The brand font uses Satoshi Bold.
          The letters appear stroke/outlined on light bg in the brand guide,
          but are solid on the dark navbar — we handle both via `variant`.
        */}
        <svg
          height={th}
          viewBox="0 0 198 44"
          fill="none"
          aria-hidden
          style={{ overflow: 'visible' }}
        >
          <text
            x="2"
            y="38"
            fontFamily="Satoshi, system-ui, sans-serif"
            fontWeight="800"
            fontSize="42"
            letterSpacing="-1.5"
            fill={variant === 'dark' ? 'none' : letterColor}
            stroke={letterStroke}
            strokeWidth={variant === 'dark' ? '2.5' : '0'}
            paintOrder="stroke"
          >
            nyBuy
          </text>
        </svg>
      </span>

      {/* ── Tagline ── */}
      {showTagline && (
        <span
          className="flex items-center leading-none mt-0.5"
          style={{ fontSize: Math.round(width * 0.09), fontFamily: 'Satoshi, sans-serif', fontWeight: 600 }}
        >
          <span style={{ color: '#22C55E' }}>Buy better.&nbsp;</span>
          <span style={{ color: '#FF6A3D' }}>Sell smarter.</span>
        </span>
      )}
    </span>
  )
}
