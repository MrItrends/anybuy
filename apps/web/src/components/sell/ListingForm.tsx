'use client'

import { Button, Input } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { findDuplicateListing, type DuplicateCandidate } from '@/lib/detectDuplicate'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, SUBCATEGORIES } from '@anybuy/types'
import type { CategorySlug, ProductCondition } from '@anybuy/types'
import { CheckCircle2, ChevronDown, Info, MapPin, Package, Shirt, Sparkles, Tag } from 'lucide-react'
import { VariantsEditor, type VariantRow } from './VariantsEditor'
import { DuplicateWarningModal } from './DuplicateWarningModal'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ImageUpload, type MediaFile } from './ImageUpload'

const CONDITIONS: { value: ProductCondition; label: string; description: string }[] = [
  { value: 'new',     label: 'Brand New',  description: 'Unused, still in original packaging' },
  { value: 'grade_a', label: 'Grade A',    description: 'Almost new, minimal to no signs of use' },
  { value: 'grade_b', label: 'Grade B',    description: 'Good condition, light wear visible' },
  { value: 'grade_c', label: 'Grade C',    description: 'Fair condition, noticeable wear' },
]

const NIGERIAN_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu',
  'Benin City', 'Kaduna', 'Onitsha', 'Warri', 'Aba', 'Jos',
]

export function ListingForm() {
  const { user } = useAuthStore()
  const router = useRouter()

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory]       = useState<CategorySlug>('phones' as CategorySlug)
  const [subcategory, setSubcategory] = useState('')
  const [condition, setCondition]     = useState<ProductCondition>('grade_a')
  const [price, setPrice]                   = useState('')
  const [originalPrice, setOriginalPrice]   = useState('')
  const [negotiable, setNegotiable]           = useState(false)
  const [negotiationFloor, setNegotiationFloor] = useState('')
  const [variants, setVariants]               = useState<VariantRow[]>([])
  const [tryonEnabled, setTryonEnabled]       = useState(false)
  const [tryonImageFile, setTryonImageFile]   = useState<File | null>(null)
  const [tryonImagePreview, setTryonImagePreview] = useState<string | null>(null)
  const [city, setCity]               = useState('Lagos')
  const [quantity, setQuantity]                     = useState('1')
  const [mediaFiles, setMediaFiles]                 = useState<MediaFile[]>([])
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false)
  const [loading, setLoading]                       = useState(false)
  const [errors, setErrors]                         = useState<Record<string, string>>({})

  // Duplicate detection
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null)
  const [pendingSubmit, setPendingSubmit]           = useState(false)

  // AI description generation
  const [generating, setGenerating] = useState(false)
  const [aiDraft,    setAiDraft]    = useState(false) // true after first AI generation

  // Generate a stable 4-char ownership code for this listing session
  const ownershipCode = useMemo(
    () => Math.random().toString(36).slice(2, 6).toUpperCase(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const subcategories = SUBCATEGORIES[category] ?? []

  function handleCategoryChange(val: CategorySlug) {
    setCategory(val)
    setSubcategory('') // reset subcategory on category change
  }

  // ── AI description helpers ──────────────────────────────────────────────────

  async function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const [header, data] = result.split(',')
        const mediaType = header.match(/data:([^;]+);/)?.[1] ?? 'image/jpeg'
        resolve({ data, mediaType })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function generateDescription() {
    const imageFiles = mediaFiles.filter(m => m.type === 'image').slice(0, 3)
    if (imageFiles.length === 0) return

    setGenerating(true)
    try {
      const images = await Promise.all(imageFiles.map(m => fileToBase64(m.file)))
      const categoryLabel = CATEGORIES.find(c => c.slug === category)?.name ?? category

      const res = await fetch('/api/ai/describe-product', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          category:  categoryLabel,
          condition,
          title: title.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg: string = data.error ?? 'Generation failed'
        // Translate billing/quota errors into a friendlier message
        const isBilling = /credit|billing|quota|balance|insufficient/i.test(msg)
        throw new Error(isBilling
          ? 'AI description is temporarily unavailable. Write your own description below.'
          : msg
        )
      }

      setDescription(data.description)
      setAiDraft(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate description. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())              e.title = 'Title is required'
    if (title.trim().length < 5)   e.title = 'Title must be at least 5 characters'
    if (!description.trim())       e.description = 'Description is required'
    if (!price || Number(price) < 100) e.price = 'Enter a valid price (min ₦100)'
    if (mediaFiles.length === 0)   e.media = 'Add at least one photo or video'
    if (!ownershipConfirmed)       e.ownership = 'Confirm that one of your photos includes the handwritten code'
    if (variants.length === 0 && (!quantity || Number(quantity) < 1))
      e.quantity = 'Enter a valid quantity (min 1)'
    if (negotiable && negotiationFloor) {
      const floor = Number(negotiationFloor)
      const ask   = Number(price)
      if (floor < 100)    e.negotiationFloor = 'Minimum must be at least ₦100'
      if (floor >= ask)   e.negotiationFloor = 'Minimum must be less than the asking price'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function uploadMedia(productId: string): Promise<{ url: string; type: 'image' | 'video' }[]> {
    const supabase = createClient()
    const results: { url: string; type: 'image' | 'video' }[] = []

    for (const media of mediaFiles) {
      const ext = media.file.name.split('.').pop()
      const path = `${user!.id}/${productId}/${Date.now()}.${ext}`
      const bucket = media.type === 'video' ? 'product-videos' : 'product-images'

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, media.file, { upsert: false })

      if (error) throw new Error(`Upload failed: ${error.message}`)

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      results.push({ url: data.publicUrl, type: media.type })
    }

    return results
  }

  async function submitListing() {
    if (!user) return
    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          original_price: originalPrice && Number(originalPrice) > Number(price) ? Number(originalPrice) : null,
          category,
          subcategory: subcategory || null,
          condition,
          is_negotiable: negotiable,
          negotiation_floor: negotiable && negotiationFloor ? Number(negotiationFloor) : null,
          is_available: true,
          location: city,
          view_count: 0,
          virtual_tryon_enabled: tryonEnabled,
          // Flat quantity only for non-variant products; variants track stock per row
          quantity: variants.length === 0 ? Math.max(1, Number(quantity) || 1) : 1,
        })
        .select('id')
        .single()

      if (productError) throw productError

      // 2. Upload media
      let uploaded: { url: string; type: 'image' | 'video' }[] = []
      try {
        uploaded = await uploadMedia(product.id)
      } catch {
        toast('Media upload failed — listing created without files. You can add them later.', { icon: '⚠️' })
      }

      // 3. Insert media records
      if (uploaded.length > 0) {
        await supabase.from('product_media').insert(
          uploaded.map((m, i) => ({
            product_id: product.id,
            url: m.url,
            type: m.type,
            order: i,
          }))
        )

        // Set thumbnail to first image (prefer image over video)
        const firstImage = uploaded.find(m => m.type === 'image') ?? uploaded[0]
        await supabase
          .from('products')
          .update({ thumbnail_url: firstImage.url })
          .eq('id', product.id)
      }

      // 4. Upload try-on image if provided
      if (tryonEnabled && tryonImageFile) {
        const ext = tryonImageFile.name.split('.').pop()
        const tryonPath = `${user.id}/${product.id}/tryon.${ext}`
        const { error: tryonErr } = await supabase.storage
          .from('product-images')
          .upload(tryonPath, tryonImageFile, { upsert: true })
        if (!tryonErr) {
          const { data: tryonData } = supabase.storage.from('product-images').getPublicUrl(tryonPath)
          await supabase.from('products').update({ tryon_image_url: tryonData.publicUrl }).eq('id', product.id)
        }
      }

      // 5. Insert variants
      if (variants.length > 0) {
        await supabase.from('product_variants').insert(
          variants.map(v => ({
            product_id: product.id,
            size_label: v.size_label || null,
            size_system: v.size_system || null,
            color_name: v.color_name || null,
            color_hex: v.color_hex || null,
            quantity: v.quantity,
          }))
        )
      }

      toast.success('Listing published! 🎉')
      router.push('/seller/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !user) return

    // Duplicate detection (only for simple listings without variants)
    if (variants.length === 0 && !pendingSubmit) {
      const supabase = createClient()
      const dup = await findDuplicateListing(supabase, user.id, category, condition, title.trim())
      if (dup) {
        setDuplicateCandidate(dup)
        setPendingSubmit(true)
        return
      }
    }

    setPendingSubmit(false)
    await submitListing()
  }

  return (
    <>
    <DuplicateWarningModal
      open={!!duplicateCandidate}
      existingListing={duplicateCandidate}
      onClose={() => { setDuplicateCandidate(null); setPendingSubmit(false) }}
      onAddStock={() => {
        if (duplicateCandidate) {
          router.push(`/seller/dashboard?tab=listings&stockUpdate=${duplicateCandidate.id}`)
        }
      }}
      onCreateAnyway={() => {
        setDuplicateCandidate(null)
        submitListing()
      }}
    />
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Media */}
      <section className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="font-satoshi font-bold text-neutral-900 text-lg mb-4">Photos & Videos</h2>

        {/* Proof of ownership instruction */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={15} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 mb-1">Proof of ownership required</p>
              <p className="text-xs text-amber-700 leading-relaxed mb-2">
                Write this code on a piece of paper and include a photo of the item alongside it.
                This protects buyers and boosts your listing's trust score.
              </p>
              <div className="inline-flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-3 py-1.5">
                <span className="text-xs text-amber-600 font-medium">Your code:</span>
                <span className="font-satoshi font-black text-amber-900 text-lg tracking-widest">
                  {ownershipCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        <ImageUpload files={mediaFiles} onChange={setMediaFiles} maxFiles={5} />

        {/* Ownership confirmation checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mt-4">
          <input
            type="checkbox"
            checked={ownershipConfirmed}
            onChange={e => setOwnershipConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-orange flex-shrink-0"
          />
          <span className="text-sm text-neutral-600">
            I confirm that at least one of my photos shows the item next to the handwritten code{' '}
            <span className="font-bold text-neutral-900 tracking-wider">{ownershipCode}</span>
          </span>
        </label>

        {(errors.media || errors.ownership) && (
          <div className="mt-2 space-y-1">
            {errors.media    && <p className="text-xs text-red-500">{errors.media}</p>}
            {errors.ownership && <p className="text-xs text-red-500">{errors.ownership}</p>}
          </div>
        )}
      </section>

      {/* Item details */}
      <section className="bg-white rounded-2xl p-6 shadow-card space-y-5">
        <h2 className="font-satoshi font-bold text-neutral-900 text-lg">Item details</h2>

        <Input
          label="Title"
          placeholder="e.g. iPhone 14 Pro Max 256GB Space Black"
          value={title}
          onChange={e => setTitle(e.target.value)}
          error={errors.title}
          hint="Be specific — good titles get more views."
          maxLength={80}
        />

        <div className="flex flex-col gap-1.5">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-neutral-900">Description</label>

            {/* AI button — only when images are present */}
            {mediaFiles.some(m => m.type === 'image') && (
              <button
                type="button"
                onClick={generateDescription}
                disabled={generating}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all
                  ${generating
                    ? 'bg-neutral-100 text-neutral-400 cursor-wait'
                    : 'bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20'}`}
              >
                {generating ? (
                  <>
                    <div className="w-3 h-3 border-[1.5px] border-neutral-400 border-t-transparent rounded-full animate-spin" />
                    Analysing photos…
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    {aiDraft ? 'Regenerate' : 'Write with AI'}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setAiDraft(false) }}
              placeholder={
                mediaFiles.some(m => m.type === 'image')
                  ? 'Upload photos above, then click "Write with AI" — or write your own description here.'
                  : 'Describe the item\'s condition, what\'s included, and anything a buyer should know…'
              }
              rows={aiDraft ? 7 : 4}
              className={`w-full px-4 py-3 bg-white border rounded-xl text-neutral-900 placeholder:text-neutral-400
                focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent resize-none text-sm transition-all
                ${generating ? 'opacity-50' : ''}
                ${errors.description ? 'border-red-400' : 'border-neutral-200 hover:border-neutral-400'}`}
            />

            {/* Shimmer overlay during generation */}
            {generating && (
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <div
                  className="absolute inset-0 opacity-60"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, oklch(0.97 0.02 60) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                  }}
                />
              </div>
            )}
          </div>

          {/* AI draft badge */}
          {aiDraft && !generating && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-brand-orange" />
                <span className="text-xs text-neutral-400">
                  Drafted from your photos · Edit freely
                </span>
              </div>
              <button
                type="button"
                onClick={generateDescription}
                className="text-xs font-semibold text-brand-orange hover:underline"
              >
                Regenerate
              </button>
            </div>
          )}

          {/* Helpful tips — only when textarea is empty and no AI draft */}
          {!description && !generating && (
            <div className="bg-neutral-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-neutral-600 mb-2">Buyers want to know:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {[
                  'Exact condition (scratches, dents)',
                  'What\'s included (box, charger)',
                  'How long you\'ve owned it',
                  'Why you\'re selling',
                  'Any defects or repairs',
                  'Whether price is negotiable',
                ].map(tip => (
                  <div key={tip} className="flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-neutral-300 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-neutral-400 leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
        </div>

        {/* Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-900">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={e => handleCategoryChange(e.target.value as CategorySlug)}
                className="w-full h-12 pl-4 pr-10 bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl
                  text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none cursor-pointer text-sm transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Subcategory */}
          {subcategories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-900">Subcategory</label>
              <div className="relative">
                <select
                  value={subcategory}
                  onChange={e => setSubcategory(e.target.value)}
                  className="w-full h-12 pl-4 pr-10 bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl
                    text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none cursor-pointer text-sm transition-all"
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Condition */}
      <section className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="font-satoshi font-bold text-neutral-900 text-lg mb-4">Condition</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                ${condition === c.value ? 'border-brand-orange bg-brand-orange/5' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
                ${condition === c.value ? 'border-brand-orange bg-brand-orange' : 'border-neutral-300'}`}>
                {condition === c.value && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${condition === c.value ? 'text-neutral-900' : 'text-neutral-700'}`}>{c.label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{c.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-2xl p-6 shadow-card space-y-5">
        <h2 className="font-satoshi font-bold text-neutral-900 text-lg">Pricing</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Selling price (₦)"
            type="number"
            placeholder="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            error={errors.price}
            hint="Set a fair price — you can always negotiate."
            leftIcon={<Tag size={16} />}
            min="100"
          />
          <Input
            label="Original price (₦) — optional"
            type="number"
            placeholder="0"
            value={originalPrice}
            onChange={e => setOriginalPrice(e.target.value)}
            hint="If discounted, enter the RRP. A discount badge will show on the card."
            leftIcon={<Tag size={16} />}
            min="0"
          />
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => { setNegotiable(!negotiable); if (negotiable) setNegotiationFloor('') }}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${negotiable ? 'bg-brand-orange' : 'bg-neutral-300'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${negotiable ? 'left-5' : 'left-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">Open to negotiation</p>
              <p className="text-xs text-neutral-500">Buyers can propose a lower price</p>
            </div>
          </label>

          {/* Negotiation floor — revealed when toggle is on */}
          {negotiable && (
            <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-brand-orange mt-0.5 flex-shrink-0" />
                <p className="text-xs text-neutral-600">
                  Set the <strong>lowest price you'll accept</strong>. Any offer at or above this amount is auto-approved — no back-and-forth needed. Leave blank to handle offers manually.
                </p>
              </div>
              <Input
                label="Minimum accepted price (₦)"
                type="number"
                placeholder={price ? `e.g. ${Math.round(Number(price) * 0.8).toLocaleString()}` : '0'}
                value={negotiationFloor}
                onChange={e => setNegotiationFloor(e.target.value)}
                error={errors.negotiationFloor}
                hint={
                  negotiationFloor && price && Number(negotiationFloor) > 0 && Number(negotiationFloor) < Number(price)
                    ? `Buyers can pay between ₦${Number(negotiationFloor).toLocaleString()} and ₦${Number(price).toLocaleString()}`
                    : 'Buyers cannot go below this amount'
                }
                leftIcon={<Tag size={16} />}
                min="100"
              />
              {negotiationFloor && price && Number(price) > 0 && Number(negotiationFloor) > 0 && Number(negotiationFloor) < Number(price) && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full"
                      style={{ width: `${((Number(price) - Number(negotiationFloor)) / Number(price)) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium text-neutral-700 whitespace-nowrap">
                    {Math.round(((Number(price) - Number(negotiationFloor)) / Number(price)) * 100)}% max discount
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {price && Number(price) > 0 && (
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-3">
              <Info size={12} /><span>Estimated payout breakdown</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Listing price</span>
              <span className="font-medium">₦{Number(price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">AnyBuy fee (5%)</span>
              <span className="text-neutral-600">−₦{Math.round(Number(price) * 0.05).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-neutral-200 pt-2 mt-2">
              <span>You receive</span>
              <span className="text-brand-green">₦{Math.round(Number(price) * 0.95).toLocaleString()}</span>
            </div>
          </div>
        )}
      </section>

      {/* Variants (sizes, colors, quantities) */}
      <section className="bg-white rounded-2xl p-6 shadow-card">
        <div className="flex items-start gap-3 mb-1">
          <Shirt size={18} className="text-brand-orange mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-satoshi font-bold text-neutral-900 text-lg">Sizes, Colors & Stock</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Add variants so buyers can pick the exact size and colour they want.
            </p>
          </div>
        </div>

        {/* Flat quantity — hidden once variants are added (stock tracked per variant) */}
        {variants.length === 0 && (
          <div className="mt-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                <Package size={14} className="text-neutral-400" />
                Stock quantity
              </label>
              <input
                type="number"
                min="1"
                max="9999"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className={`h-11 w-36 px-4 border rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all
                  ${errors.quantity ? 'border-red-400' : 'border-neutral-200'}`}
              />
              {errors.quantity && <p className="text-xs text-red-500">{errors.quantity}</p>}
              <p className="text-xs text-neutral-400">
                How many units do you have to sell? Once you add variants below, stock is tracked per variant instead.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5">
          <VariantsEditor variants={variants} onChange={setVariants} />
        </div>
      </section>

      {/* Virtual Try-On */}
      <section className="bg-white rounded-2xl p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-satoshi font-bold text-neutral-900 text-lg">Virtual Try-On</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Buyers can overlay this item on their own photo before buying.
            </p>
          </div>
          {/* Toggle */}
          <button
            type="button"
            onClick={() => { setTryonEnabled(!tryonEnabled); if (tryonEnabled) { setTryonImageFile(null); setTryonImagePreview(null) } }}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${tryonEnabled ? 'bg-brand-orange' : 'bg-neutral-300'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tryonEnabled ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        {tryonEnabled && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              💡 <strong>Tip:</strong> Upload a photo of the item on a clean white or transparent background for the best try-on experience.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-neutral-900">Try-on image</span>
              <div className={`mt-2 border-2 border-dashed rounded-xl overflow-hidden transition-colors ${tryonImagePreview ? 'border-brand-orange' : 'border-neutral-200 hover:border-neutral-400'}`}>
                {tryonImagePreview ? (
                  <div className="relative">
                    <img src={tryonImagePreview} alt="Try-on preview" className="w-full max-h-64 object-contain bg-neutral-50 p-4" />
                    <button
                      type="button"
                      onClick={() => { setTryonImageFile(null); setTryonImagePreview(null) }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-neutral-500 hover:text-red-500 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-neutral-400">
                    <Shirt size={28} />
                    <p className="text-sm">Click to upload try-on image</p>
                    <p className="text-xs">PNG with transparent background works best</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setTryonImageFile(file)
                  const reader = new FileReader()
                  reader.onload = ev => setTryonImagePreview(ev.target?.result as string)
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          </div>
        )}
      </section>

      {/* Location */}
      <section className="bg-white rounded-2xl p-6 shadow-card">
        <h2 className="font-satoshi font-bold text-neutral-900 text-lg mb-4">Location</h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-900">City</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full h-12 pl-9 pr-10 bg-white border border-neutral-200 hover:border-neutral-400 rounded-xl
                text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-orange appearance-none cursor-pointer text-sm transition-all"
            >
              {NIGERIAN_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex flex-col gap-3 pb-8">
        <Button type="submit" size="lg" fullWidth loading={loading} className="gap-2">
          <CheckCircle2 size={18} />
          Publish listing
        </Button>
        <p className="text-xs text-center text-neutral-500">
          Your listing goes live immediately after publishing.
        </p>
      </div>
    </form>
    </>
  )
}
