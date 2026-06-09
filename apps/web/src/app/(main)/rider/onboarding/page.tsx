'use client'

import { RiderOnboarding } from '@/components/rider/RiderOnboarding'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function RiderOnboardingPage() {
  const { user, loading: authLoading } = useAuthStore()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/rider'); return }

    async function check() {
      const supabase = createClient()
      const { data } = await supabase
        .from('rider_profiles')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (data) {
        // Already started onboarding — go to dashboard
        router.replace('/rider/dashboard')
      } else {
        setReady(true)
      }
    }

    check()
  }, [authLoading, user, router])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link href="/rider"
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            <ArrowLeft size={16} />Back
          </Link>
          <div className="h-4 w-px bg-neutral-200" />
          <h1 className="font-satoshi font-bold text-neutral-900 text-base">Rider application</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {!ready ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <RiderOnboarding />
        )}
      </div>
    </div>
  )
}
