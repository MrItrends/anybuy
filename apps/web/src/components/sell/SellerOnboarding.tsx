'use client'

import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES } from '@anybuy/types'
import { CheckCircle2, ShieldCheck, Upload, Zap } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'

interface SellerOnboardingProps {
  onComplete: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NIGERIAN_CITIES = [
  'Aba', 'Abeokuta', 'Abuja', 'Akure', 'Asaba', 'Awka', 'Bauchi', 'Benin City',
  'Calabar', 'Enugu', 'Ibadan', 'Ilorin', 'Jos', 'Kaduna', 'Kano', 'Lagos',
  'Maiduguri', 'Makurdi', 'Minna', 'Onitsha', 'Owerri', 'Port Harcourt',
  'Sokoto', 'Uyo', 'Warri', 'Yola', 'Zaria',
]

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Guaranty Trust Bank (GTB)',
  'Heritage Bank', 'Jaiz Bank', 'Keystone Bank', 'Kuda Bank', 'Moniepoint',
  'OPay', 'PalmPay', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'Union Bank',
  'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank', 'Zenith Bank',
]

const TIER_1_LIMITS = [
  { icon: Zap, text: 'Up to 5 active listings on day one' },
  { icon: ShieldCheck, text: '7-day payout hold on completed sales' },
  { icon: CheckCircle2, text: 'Live selling unlocked once identity is verified' },
]

// ─── File upload zone ─────────────────────────────────────────────────────────

function FileUploadZone({
  label, hint, file, onFile,
}: {
  label: string
  hint: string
  file: File | null
  onFile: (f: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const previewUrl = file ? URL.createObjectURL(file) : null

  return (
    <div>
      <p className="text-sm font-medium text-neutral-900 mb-1">{label}</p>
      <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{hint}</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full border-2 border-dashed border-neutral-200 rounded-2xl p-4 hover:border-brand-orange/40 hover:bg-orange-50/40 transition-all text-left"
      >
        {previewUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{file!.name}</p>
              <p className="text-xs text-brand-orange mt-0.5">Tap to replace</p>
            </div>
            <CheckCircle2 size={18} className="text-brand-green flex-shrink-0" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Upload size={18} className="text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">Tap to upload</p>
          </div>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Basics', 'Identity', 'Launch']
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const n = i + 1 as 1 | 2 | 3
        const done    = current > n
        const active  = current === n
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${done   ? 'bg-brand-green text-white'
                  : active ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30'
                           : 'bg-neutral-100 text-neutral-400'}`}
              >
                {done ? <CheckCircle2 size={16} /> : n}
              </div>
              <span className={`text-[11px] font-semibold transition-colors
                ${active ? 'text-brand-orange' : done ? 'text-brand-green' : 'text-neutral-400'}`}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 transition-colors
                ${current > n ? 'bg-brand-green' : 'bg-neutral-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Select wrapper ───────────────────────────────────────────────────────────

function Select({ label, value, onChange, options, placeholder, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-neutral-900">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange text-sm transition-all appearance-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SellerOnboarding({ onComplete }: SellerOnboardingProps) {
  const { user } = useAuthStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 — Basics
  const [storeName,      setStoreName]      = useState(user?.full_name ?? '')
  const [phone,          setPhone]          = useState(user?.phone ?? '')
  const [city,           setCity]           = useState('')
  const [sellerState,    setSellerState]    = useState('')
  const [categoryFocus,  setCategoryFocus]  = useState('')

  // Step 2 — Identity
  const [nin,           setNin]           = useState('')
  const [idFrontFile,   setIdFrontFile]   = useState<File | null>(null)
  const [selfieFile,    setSelfieFile]    = useState<File | null>(null)
  const [bankName,      setBankName]      = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName,   setAccountName]  = useState('')

  // Step 3 — Terms
  const [agreed,   setAgreed]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // ── Step 1 validation ───────────────────────────────────────────────────────
  function validateStep1() {
    if (!storeName.trim()) { setError('Store name is required.'); return false }
    if (!phone.trim())     { setError('Phone number is required.'); return false }
    if (!city)             { setError('Please select your city.'); return false }
    if (!sellerState)      { setError('Please select your state.'); return false }
    setError('')
    return true
  }

  // ── Step 2 validation ───────────────────────────────────────────────────────
  function validateStep2() {
    if (!nin.trim() || nin.replace(/\D/g, '').length !== 11) {
      setError('NIN must be exactly 11 digits.'); return false
    }
    if (!idFrontFile)       { setError('Please upload a photo of your ID card.'); return false }
    if (!selfieFile)        { setError('Please upload your selfie photo.'); return false }
    if (!bankName)          { setError('Please select your bank.'); return false }
    if (accountNumber.replace(/\D/g, '').length !== 10) {
      setError('Account number must be exactly 10 digits.'); return false
    }
    if (!accountName.trim()) { setError('Account name is required.'); return false }
    setError('')
    return true
  }

  // ── Upload a KYC file to storage ───────────────────────────────────────────
  async function uploadKycFile(file: File, name: string): Promise<string> {
    const supabase = createClient()
    const ext  = file.name.split('.').pop()
    const path = `${user!.id}/${name}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('kyc')
      .upload(path, file, { upsert: true })
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)
    const { data } = supabase.storage.from('kyc').getPublicUrl(path)
    return data.publicUrl
  }

  // ── Final submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Please accept the seller terms to continue.'); return }
    if (!user) return

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()

      // Upload KYC documents
      const [idFrontUrl, selfieUrl] = await Promise.all([
        uploadKycFile(idFrontFile!, 'id_front'),
        uploadKycFile(selfieFile!, 'selfie'),
      ])

      // Upsert seller profile
      const { error: spErr } = await supabase.from('seller_profiles').upsert({
        user_id:            user.id,
        store_name:         storeName.trim(),
        store_description:  '',
        total_sales:        0,
        response_rate:      100,
        verified_seller:    false,
        seller_tier:        1,
        trust_score:        0,
        kyc_status:         'submitted',
        kyc_nin:            nin.replace(/\D/g, ''),
        kyc_id_front_url:   idFrontUrl,
        kyc_selfie_url:     selfieUrl,
        bank_name:          bankName,
        bank_account_number: accountNumber.replace(/\D/g, ''),
        bank_account_name:  accountName.trim(),
        category_focus:     categoryFocus || null,
        listing_limit:      5,
      })
      if (spErr) throw spErr

      // Update profile — role + phone
      await supabase
        .from('profiles')
        .update({
          role: 'seller',
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        })
        .eq('id', user.id)

      document.cookie = 'anybuy-seller=1; path=/; max-age=2592000; SameSite=Lax'
      toast.success('Seller account created! Welcome to AnyBuy.')
      onComplete()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-2">
        <Image
          src="/form_Logo.svg"
          alt="AnyBuy"
          width={90}
          height={28}
          className="mx-auto mb-5 h-7 w-auto"
        />
        <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Become a seller</h1>
        <p className="text-neutral-500 mt-1.5 text-sm">
          {step === 1 && 'Tell us about your store. Takes under a minute.'}
          {step === 2 && 'Verify your identity. Documents reviewed within 24 hours.'}
          {step === 3 && 'Review your account limits and agree to the seller terms.'}
        </p>
      </div>

      <div className="mt-6">
        <StepIndicator current={step} />
      </div>

      {/* ── STEP 1: BASICS ──────────────────────────────────────────────── */}
      {step === 1 && (
        <form
          onSubmit={e => { e.preventDefault(); if (validateStep1()) setStep(2) }}
          className="space-y-4"
        >
          <Input
            label="Store / Display Name"
            placeholder="e.g. GadgetHub NG"
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            required
            hint="This is what buyers see on your listings."
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            hint="Used for order notifications. Not shown publicly."
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="City"
              value={city}
              onChange={setCity}
              options={NIGERIAN_CITIES}
              placeholder="Select city"
              required
            />
            <Select
              label="State"
              value={sellerState}
              onChange={setSellerState}
              options={NIGERIAN_STATES}
              placeholder="Select state"
              required
            />
          </div>
          <Select
            label="Main category (optional)"
            value={categoryFocus}
            onChange={setCategoryFocus}
            options={CATEGORIES.map(c => c.name)}
            placeholder="What do you mainly sell?"
          />

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button type="submit" fullWidth size="lg">
            Next: Identity verification →
          </Button>
        </form>
      )}

      {/* ── STEP 2: IDENTITY ────────────────────────────────────────────── */}
      {step === 2 && (
        <form
          onSubmit={e => { e.preventDefault(); if (validateStep2()) setStep(3) }}
          className="space-y-5"
        >
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3.5">
            <p className="text-sm text-blue-700 font-medium leading-relaxed">
              We verify all sellers to protect buyers and your reputation. Your documents are reviewed by our team within 24 hours — you can start listing immediately with up to 5 items.
            </p>
          </div>

          <Input
            label="National Identification Number (NIN)"
            placeholder="00000000000"
            value={nin}
            onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
            required
            hint="Your 11-digit NIN from your NIMC slip or national ID card."
          />

          <FileUploadZone
            label="ID Card Photo (front)"
            hint="Upload a clear photo of the front of your national ID, driver's licence, or international passport."
            file={idFrontFile}
            onFile={setIdFrontFile}
          />

          <FileUploadZone
            label="Selfie holding your ID"
            hint="Take a clear photo of yourself holding your ID card next to your face. Both faces must be clearly visible."
            file={selfieFile}
            onFile={setSelfieFile}
          />

          <div className="border-t border-neutral-100 pt-5">
            <p className="text-sm font-semibold text-neutral-900 mb-3">Bank account for payouts</p>
            <div className="space-y-3">
              <Select
                label="Bank"
                value={bankName}
                onChange={setBankName}
                options={NIGERIAN_BANKS}
                placeholder="Select your bank"
                required
              />
              <Input
                label="Account Number"
                placeholder="0000000000"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                hint="Your 10-digit NUBAN account number."
              />
              <Input
                label="Account Name"
                placeholder="As it appears on your bank account"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                required
                hint="Must match your bank records exactly."
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep(1); setError('') }}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              ← Back
            </button>
            <Button type="submit" fullWidth size="lg">
              Next: Review & launch →
            </Button>
          </div>
        </form>
      )}

      {/* ── STEP 3: TERMS + LAUNCH ──────────────────────────────────────── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Summary card */}
          <div className="bg-neutral-50 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-neutral-900">Your Tier 1 account starts with:</p>
            <div className="space-y-2.5">
              {TIER_1_LIMITS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon size={15} className="text-brand-orange flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{text}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-200 pt-3 mt-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Once our team approves your identity documents, you'll move to Tier 2: 30 listings, live selling unlocked, and a 3-day payout hold.
              </p>
            </div>
          </div>

          {/* Store summary */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Store name</span>
              <span className="font-medium text-neutral-900">{storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Location</span>
              <span className="font-medium text-neutral-900">{city}, {sellerState}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Bank</span>
              <span className="font-medium text-neutral-900">{bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Account</span>
              <span className="font-medium text-neutral-900">
                {accountNumber} · {accountName}
              </span>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-orange flex-shrink-0"
            />
            <span className="text-sm text-neutral-600">
              I agree to AnyBuy's{' '}
              <a href="/terms" className="text-brand-orange hover:underline">Seller Terms</a>
              {' '}and understand that a{' '}
              <span className="font-medium text-neutral-900">5% platform fee</span>
              {' '}applies to every completed sale.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep(2); setError('') }}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              ← Back
            </button>
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Start selling →
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
