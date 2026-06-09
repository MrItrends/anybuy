'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-white/60 hover:text-white text-sm font-medium transition-colors mb-6"
    >
      <ChevronLeft size={16} />
      Back
    </button>
  )
}
