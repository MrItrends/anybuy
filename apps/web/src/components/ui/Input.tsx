import { cn } from '@/lib/cn'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Input({ label, error, hint, leftIcon, rightIcon, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-900">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-neutral-600 pointer-events-none">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full h-12 bg-white border rounded-xl text-neutral-900 placeholder:text-neutral-600 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent',
            'disabled:bg-neutral-100 disabled:cursor-not-allowed',
            error ? 'border-red-400' : 'border-neutral-200 hover:border-neutral-400',
            leftIcon ? 'pl-10' : 'pl-4',
            rightIcon ? 'pr-10' : 'pr-4',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 text-neutral-600">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-neutral-600">{hint}</p>}
    </div>
  )
}
