'use client'

import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
}

const variants = {
  primary: 'bg-brand-orange hover:bg-[#e85a2d] text-white shadow-orange active:scale-[0.98]',
  secondary: 'bg-brand-dark hover:bg-[#1a4445] text-white active:scale-[0.98]',
  outline: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white active:scale-[0.98]',
  ghost: 'text-neutral-900 hover:bg-neutral-100 active:scale-[0.98]',
  danger: 'bg-red-500 hover:bg-red-600 text-white active:scale-[0.98]',
}

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  )
}
