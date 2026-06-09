import { cn } from '@/lib/cn'
import type { ProductCondition } from '@anybuy/types'
import { CONDITION_SHORT_LABELS, CONDITION_TOOLTIPS } from '@anybuy/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'orange' | 'gray' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

const variants = {
  default: 'bg-neutral-100 text-neutral-900',
  green: 'bg-green-50 text-green-700 border border-green-200',
  orange: 'bg-orange-50 text-brand-orange border border-orange-200',
  gray: 'bg-neutral-100 text-neutral-600',
  outline: 'border border-neutral-200 text-neutral-600 bg-white',
}

const sizes = {
  sm: 'text-xs px-2 py-0.5 rounded-md',
  md: 'text-sm px-3 py-1 rounded-lg',
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

interface ConditionBadgeProps {
  condition: ProductCondition
  size?: 'sm' | 'md'
}

export function ConditionBadge({ condition, size = 'sm' }: ConditionBadgeProps) {
  const variantMap: Record<ProductCondition, BadgeProps['variant']> = {
    new: 'green',
    grade_a: 'green',
    grade_b: 'orange',
    grade_c: 'gray',
  }

  const iconColor: Record<ProductCondition, string> = {
    new: 'text-green-500',
    grade_a: 'text-green-500',
    grade_b: 'text-amber-500',
    grade_c: 'text-neutral-400',
  }

  return (
    <Badge variant={variantMap[condition]} size={size} className="gap-1">
      {CONDITION_SHORT_LABELS[condition]}
      {/* Info icon + CSS-only tooltip */}
      <span
        className="relative inline-flex items-center group/tip"
        onClick={e => e.preventDefault()}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          className={cn('flex-shrink-0 opacity-60 group-hover/tip:opacity-100 transition-opacity', iconColor[condition])}
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.25" />
          <rect x="5.4" y="5.2" width="1.2" height="3.6" rx="0.6" fill="currentColor" />
          <circle cx="6" cy="3.6" r="0.7" fill="currentColor" />
        </svg>
        {/* Tooltip */}
        <span className={cn(
          'pointer-events-none absolute bottom-full right-0 mb-1.5 z-50',
          'w-max max-w-[160px] px-2.5 py-1.5 rounded-lg text-[11px] font-medium leading-snug',
          'bg-neutral-900 text-white shadow-lg',
          'opacity-0 group-hover/tip:opacity-100 scale-95 group-hover/tip:scale-100',
          'transition-all duration-150 origin-bottom-right',
          'whitespace-normal',
        )}>
          {CONDITION_TOOLTIPS[condition]}
          {/* Arrow */}
          <span className="absolute -bottom-1 right-2.5 w-2 h-2 bg-neutral-900 rotate-45" />
        </span>
      </span>
    </Badge>
  )
}

export function LiveBadge({ viewerCount }: { viewerCount?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-slow" />
      LIVE
      {viewerCount !== undefined && <span className="opacity-90">{viewerCount.toLocaleString()}</span>}
    </span>
  )
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-brand-green text-xs font-semibold', className)}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 0L7.39 4.26L12 4.9L8.7 7.88L9.77 12L6 9.67L2.23 12L3.3 7.88L0 4.9L4.61 4.26L6 0Z" fill="currentColor" />
      </svg>
      Verified
    </span>
  )
}
