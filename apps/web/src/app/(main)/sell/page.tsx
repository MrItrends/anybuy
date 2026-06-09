'use client'

import { SellerOnboarding } from '@/components/sell/SellerOnboarding'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// sell/page.tsx — onboarding only.
// Existing sellers are redirected to /seller/dashboard immediately.
// New listings go through /seller/new-listing.
type Step = 'loading' | 'onboarding'

export default function SellPage() {
  const { user, loading: authLoading } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')

  useEffect(() => {
    // Wait until auth has fully resolved before doing anything
    if (authLoading) return
    if (!user) { router.replace('/'); return }

    async function checkSellerProfile() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) {
        // Network/fetch error — don't redirect, just show the loading spinner
        // and let the user retry. Prevents bouncing on flaky connections.
        console.warn('[SellPage] profile check failed:', error.message)
        return
      }

      if (data) {
        // Already a seller — send them to the dashboard
        router.replace('/seller/dashboard')
      } else {
        setStep('onboarding')
      }
    }

    checkSellerProfile()
  }, [authLoading, user, router])

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <div className="bg-white border-b border-neutral-200 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <div className="h-4 w-px bg-neutral-200" />
          <h1 className="font-satoshi font-bold text-neutral-900 text-base">Seller setup</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {step === 'loading' && (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {step === 'onboarding' && (
          <SellerOnboarding onComplete={() => router.push('/seller/dashboard')} />
        )}
      </div>
    </div>
  )
}
