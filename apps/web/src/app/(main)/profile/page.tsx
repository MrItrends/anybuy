'use client'

import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { BadgeCheck, LogOut, Package, ShieldCheck, Star, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface SellerProfile {
  store_name: string
  total_sales: number
  verified_seller: boolean
}

export default function ProfilePage() {
  const { user, setUser, requireAuth } = useAuthStore()
  const router = useRouter()

  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requireAuth()) {
      router.replace('/')
      return
    }

    async function load() {
      if (!user) return
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setPhone(profile.phone ?? '')
      }

      const { data: sp } = await supabase
        .from('seller_profiles')
        .select('store_name, total_sales, verified_seller')
        .eq('user_id', user.id)
        .maybeSingle()

      setSellerProfile(sp)
      setLoading(false)
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to save changes')
    } else {
      setUser({ ...user, full_name: fullName.trim() })
      toast.success('Profile updated!')
    }
    setSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    document.cookie = 'anybuy-seller=; path=/; max-age=0'
    setUser(null)
    toast.success('Signed out')
    router.replace('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-brand-dark">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-orange flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl font-satoshi">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div>
            <h1 className="font-satoshi text-xl font-bold text-white">{user?.full_name}</h1>
            <p className="text-white/50 text-sm mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Seller badge */}
        {sellerProfile && (
          <div className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
              <Package size={18} className="text-brand-orange" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-neutral-900">{sellerProfile.store_name}</p>
                {sellerProfile.verified_seller && (
                  <BadgeCheck size={15} className="text-brand-green" />
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{sellerProfile.total_sales} sales completed</p>
            </div>
            <button
              onClick={() => router.push('/seller/dashboard')}
              className="text-xs font-semibold text-brand-orange hover:underline"
            >
              Dashboard →
            </button>
          </div>
        )}

        {/* Edit profile */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="font-satoshi font-bold text-neutral-900 mb-5">Personal info</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              leftIcon={<User size={16} />}
            />
            <Input
              label="Phone number"
              type="tel"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <div className="pt-1">
              <Input
                label="Email"
                value={user?.email ?? ''}
                disabled
                hint="Email cannot be changed here."
              />
            </div>
            <Button type="submit" loading={saving} className="mt-2">
              Save changes
            </Button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <Star size={18} className="text-amber-400 fill-amber-400" />
            </div>
            <div>
              <p className="font-satoshi font-bold text-neutral-900">
                {user?.rating ?? 0}
              </p>
              <p className="text-xs text-neutral-500">{user?.rating_count ?? 0} reviews</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-brand-green" />
            </div>
            <div>
              <p className="font-satoshi font-bold text-neutral-900">
                {user?.is_verified ? 'Verified' : 'Unverified'}
              </p>
              <p className="text-xs text-neutral-500">Account status</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="font-satoshi font-bold text-neutral-900 mb-1">Account</h2>
          <p className="text-sm text-neutral-500 mb-4">
            Signing out will clear your session on this device.
          </p>
          <Button variant="danger" onClick={handleSignOut} className="gap-2">
            <LogOut size={15} />
            Sign out
          </Button>
        </div>

      </div>
    </div>
  )
}
