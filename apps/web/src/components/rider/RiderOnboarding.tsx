'use client'

import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { Car, CheckCircle2, ChevronRight, Upload } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState, type RefObject } from 'react'
import toast from 'react-hot-toast'

const VEHICLE_TYPES = ['motorcycle', 'bicycle', 'car', 'van'] as const
type VehicleType = typeof VEHICLE_TYPES[number]

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: '🏍️ Motorcycle',
  bicycle:    '🚲 Bicycle',
  car:        '🚗 Car',
  van:        '🚐 Van',
}

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

const NIGERIAN_BANKS = [
  'Access Bank','Citibank','Ecobank','Fidelity Bank','First Bank','First City Monument Bank',
  'Guaranty Trust Bank','Heritage Bank','Keystone Bank','Polaris Bank','Providus Bank',
  'Stanbic IBTC Bank','Sterling Bank','Union Bank','United Bank for Africa','Unity Bank',
  'Wema Bank','Zenith Bank','Moniepoint','Kuda Bank','PalmPay','Opay',
]

type Step = 1 | 2 | 3

interface FileUpload {
  file: File | null
  url: string | null
  uploading: boolean
}

function useFileUpload(): [FileUpload, (file: File) => Promise<string | null>, RefObject<HTMLInputElement>] {
  const [state, setState] = useState<FileUpload>({ file: null, url: null, uploading: false })
  const ref = useRef<HTMLInputElement>(null)

  async function upload(file: File): Promise<string | null> {
    setState(s => ({ ...s, file, uploading: true }))
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('rider-docs').upload(path, file, { upsert: true })
    if (error) {
      toast.error('Upload failed. Try again.')
      setState(s => ({ ...s, uploading: false }))
      return null
    }
    const { data: urlData } = supabase.storage.from('rider-docs').getPublicUrl(data.path)
    setState(s => ({ ...s, url: urlData.publicUrl, uploading: false }))
    return urlData.publicUrl
  }

  return [state, upload, ref]
}

function PhotoUpload({
  label,
  description,
  value,
  onUpload,
  inputRef,
}: {
  label: string
  description?: string
  value: FileUpload
  onUpload: (file: File) => Promise<string | null>
  inputRef: RefObject<HTMLInputElement>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
      {description && <p className="text-xs text-neutral-500 mb-2">{description}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
      />
      {value.url ? (
        <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 aspect-video">
          <img src={value.url} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/80 transition-all"
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={value.uploading}
          className="w-full border-2 border-dashed border-neutral-300 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-brand-orange/50 hover:bg-brand-orange/[0.02] transition-all disabled:opacity-50"
        >
          {value.uploading ? (
            <div className="w-6 h-6 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload size={20} className="text-neutral-400" />
          )}
          <span className="text-sm text-neutral-500">{value.uploading ? 'Uploading…' : 'Tap to upload photo'}</span>
        </button>
      )}
    </div>
  )
}

export function RiderOnboarding() {
  const { user, setUser } = useAuthStore()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 — Personal info
  const [phone, setPhone]   = useState(user?.phone ?? '')
  const [city, setCity]     = useState('')
  const [state, setState]   = useState('')

  // Step 2 — Identity & Vehicle
  const [nin, setNin]               = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorcycle')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')

  const [idFront, uploadIdFront, idFrontRef]       = useFileUpload()
  const [idBack, uploadIdBack, idBackRef]           = useFileUpload()
  const [selfie, uploadSelfie, selfieRef]           = useFileUpload()
  const [licensePhoto, uploadLicensePhoto, licensePhotoRef] = useFileUpload()

  // Step 3 — Banking & Terms
  const [bankName, setBankName]               = useState('')
  const [accountNumber, setAccountNumber]     = useState('')
  const [accountName, setAccountName]         = useState('')
  const [agreed, setAgreed]                   = useState(false)

  function validateStep1() {
    if (!phone.trim()) { toast.error('Phone number is required'); return false }
    if (!city.trim())  { toast.error('City is required'); return false }
    if (!state)        { toast.error('State is required'); return false }
    return true
  }

  function validateStep2() {
    if (!nin.trim() || nin.trim().length !== 11) { toast.error('Enter a valid 11-digit NIN'); return false }
    if (!idFront.url)     { toast.error('Upload your ID card (front)'); return false }
    if (!idBack.url)      { toast.error('Upload your ID card (back)'); return false }
    if (!selfie.url)      { toast.error('Upload your selfie with ID'); return false }
    if (vehicleType !== 'bicycle' && !vehiclePlate.trim()) { toast.error('Vehicle plate is required'); return false }
    if (!licenseNumber.trim()) { toast.error('Driver\'s license number is required'); return false }
    if (!licensePhoto.url)     { toast.error('Upload your license photo'); return false }
    return true
  }

  function validateStep3() {
    if (!bankName)            { toast.error('Select your bank'); return false }
    if (accountNumber.trim().length !== 10) { toast.error('Enter a valid 10-digit account number'); return false }
    if (!accountName.trim())  { toast.error('Account name is required'); return false }
    if (!agreed)              { toast.error('Please accept the rider terms to continue'); return false }
    return true
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => (s + 1) as Step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep3()) return
    if (!user) return

    setSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from('rider_profiles').upsert({
        user_id:            user.id,
        vehicle_type:       vehicleType,
        vehicle_plate:      vehiclePlate.trim() || null,
        city:               city.trim(),
        state,
        is_available:       false,
        status:             'pending',
        nin:                nin.trim(),
        id_front_url:       idFront.url,
        id_back_url:        idBack.url,
        selfie_url:         selfie.url,
        license_number:     licenseNumber.trim(),
        license_photo_url:  licensePhoto.url,
        bank_name:          bankName,
        bank_account_number: accountNumber.trim(),
        bank_account_name:  accountName.trim(),
      })
      if (error) throw error

      await supabase.from('profiles').update({
        role:  'rider',
        phone: phone.trim(),
      }).eq('id', user.id)

      setUser({ ...user, role: 'rider', phone: phone.trim() })
      document.cookie = 'anybuy-rider=1; path=/; max-age=2592000; SameSite=Lax'
      document.cookie = 'anybuy-seller=; path=/; max-age=0'

      toast.success('Application submitted! We\'ll review it within 24–48 hours.')
      router.push('/rider/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const STEPS = [
    { n: 1, label: 'Personal info' },
    { n: 2, label: 'Identity & Vehicle' },
    { n: 3, label: 'Banking & Terms' },
  ]

  return (
    <div className="max-w-lg mx-auto">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <Image src="/form_Logo.svg" alt="AnyBuy" width={90} height={28} style={{ height: '28px', width: 'auto' }} />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                ${step > s.n ? 'bg-brand-orange text-white' : step === s.n ? 'bg-brand-orange text-white' : 'bg-neutral-200 text-neutral-400'}`}>
                {step > s.n ? <CheckCircle2 size={14} /> : s.n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${step === s.n ? 'text-neutral-900' : 'text-neutral-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-brand-orange' : 'bg-neutral-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Personal info ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Personal information</h1>
            <p className="text-neutral-500 text-sm mt-1">Tell us where you're based and how to reach you.</p>
          </div>

          <div className="space-y-4">
            <Input
              label="Phone number"
              type="tel"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              hint="Used for delivery notifications. Not shown publicly."
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                placeholder="Lagos"
                value={city}
                onChange={e => setCity(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">State</label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900
                    focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={nextStep}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white text-sm font-semibold h-12 rounded-xl hover:bg-[#e85a2d] transition-all"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Step 2: Identity & Vehicle ── */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Identity & Vehicle</h1>
            <p className="text-neutral-500 text-sm mt-1">
              We verify all riders to protect buyers. Documents are reviewed within 48 hours.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">Why do we need this?</p>
            <p className="text-xs text-blue-700">
              Your documents are stored securely and only reviewed by AnyBuy compliance staff.
              We never share them with sellers or buyers.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="NIN (National Identification Number)"
              placeholder="12345678901"
              value={nin}
              onChange={e => setNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
              required
              hint="11-digit number on your NIN slip or national ID card."
            />

            <PhotoUpload
              label="Government-issued ID (front)"
              description="Voter's card, NIN card, driver's license, or international passport"
              value={idFront}
              onUpload={uploadIdFront}
              inputRef={idFrontRef}
            />

            <PhotoUpload
              label="Government-issued ID (back)"
              value={idBack}
              onUpload={uploadIdBack}
              inputRef={idBackRef}
            />

            <PhotoUpload
              label="Selfie holding your ID"
              description="Take a clear photo of yourself holding your ID card next to your face."
              value={selfie}
              onUpload={uploadSelfie}
              inputRef={selfieRef}
            />
          </div>

          <hr className="border-neutral-200" />

          <div className="space-y-4">
            <p className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
              <Car size={15} className="text-neutral-500" />Vehicle information
            </p>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Vehicle type</label>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button key={v} type="button" onClick={() => setVehicleType(v)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border-2 transition-all text-left
                      ${vehicleType === v
                        ? 'border-brand-orange bg-brand-orange/5 text-brand-orange'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'}`}>
                    {VEHICLE_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>

            {vehicleType !== 'bicycle' && (
              <Input
                label="Vehicle plate number"
                placeholder="e.g. LND-234-AA"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value)}
                required
              />
            )}

            <Input
              label="Driver's license number"
              placeholder="e.g. ABC-12345-EFG"
              value={licenseNumber}
              onChange={e => setLicenseNumber(e.target.value)}
              required
            />

            <PhotoUpload
              label="Driver's license photo"
              description="Upload a clear photo of your driver's license."
              value={licensePhoto}
              onUpload={uploadLicensePhoto}
              inputRef={licensePhotoRef}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:border-neutral-400 transition-all"
            >
              Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="flex-[2] flex items-center justify-center gap-2 bg-brand-orange text-white text-sm font-semibold h-12 rounded-xl hover:bg-[#e85a2d] transition-all"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Banking & Terms ── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="font-satoshi text-2xl font-bold text-neutral-900">Banking details</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Your delivery earnings will be paid to this account. Verified by our team before first payout.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Bank name</label>
              <select
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900
                  focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all"
              >
                <option value="">Select your bank</option>
                {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <Input
              label="Account number"
              placeholder="0123456789"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              hint="10-digit NUBAN account number."
            />

            <Input
              label="Account name"
              placeholder="As it appears on your bank statement"
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              required
              hint="Must match the name registered with your bank."
            />
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2 text-sm text-neutral-600">
            <p className="font-semibold text-neutral-800">What happens after you submit?</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-brand-orange mt-0.5 flex-shrink-0" />Your documents will be reviewed within 24–48 hours</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-brand-orange mt-0.5 flex-shrink-0" />You'll be notified by email when approved</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-brand-orange mt-0.5 flex-shrink-0" />Once approved, you can immediately start accepting deliveries</li>
            </ul>
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
              <a href="/terms" className="text-brand-orange hover:underline">Rider Terms</a>
              {' '}and confirm that all information and documents I've provided are accurate and genuine.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 h-12 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:border-neutral-400 transition-all"
            >
              Back
            </button>
            <Button type="submit" loading={submitting} className="flex-[2]" size="lg">
              Submit application
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
