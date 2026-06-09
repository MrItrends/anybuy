'use client'

import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@anybuy/utils'
import { Loader2, Plus, Tag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const OCCASIONS = [
  { value: 'black_friday', label: '🖤 Black Friday' },
  { value: 'easter',       label: '🐣 Easter' },
  { value: 'ramadan',      label: '🌙 Ramadan' },
  { value: 'salah',        label: '🎉 Salah' },
  { value: 'christmas',    label: '🎄 Christmas' },
  { value: 'new_year',     label: '🎆 New Year' },
  { value: 'custom',       label: '✏️ Custom' },
]

interface Listing { id: string; title: string; price: number }
interface Discount {
  id: string
  product_id: string | null
  occasion: string | null
  label: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  applies_to: string
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
}

interface DiscountsTabProps {
  sellerId: string
  listings: Listing[]
}

export function DiscountsTab({ sellerId, listings }: DiscountsTabProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)

  // Form state
  const [occasion, setOccasion]     = useState('custom')
  const [label, setLabel]           = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [appliesTo, setAppliesTo]   = useState<'product' | 'all_listings'>('all_listings')
  const [productId, setProductId]   = useState('')
  const [startsAt, setStartsAt]     = useState('')
  const [endsAt, setEndsAt]         = useState('')

  useEffect(() => { load() }, [sellerId])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('discounts')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
    setDiscounts(data ?? [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(discountValue)
    if (!val || val <= 0) { toast.error('Enter a valid discount value'); return }
    if (discountType === 'percentage' && val > 90) { toast.error('Max discount is 90%'); return }
    if (appliesTo === 'product' && !productId) { toast.error('Select a product'); return }

    setSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('discounts')
      .insert({
        seller_id: sellerId,
        occasion,
        label: (label.trim() || OCCASIONS.find(o => o.value === occasion)?.label.replace(/^\S+\s/, '')) ?? label,
        discount_type: discountType,
        discount_value: val,
        applies_to: appliesTo,
        product_id: appliesTo === 'product' ? productId : null,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      toast.error('Could not create discount')
    } else {
      setDiscounts(prev => [data, ...prev])
      setShowForm(false)
      resetForm()
      toast.success('Discount created!')
    }
    setSaving(false)
  }

  function resetForm() {
    setOccasion('custom'); setLabel(''); setDiscountType('percentage')
    setDiscountValue(''); setAppliesTo('all_listings'); setProductId('')
    setStartsAt(''); setEndsAt('')
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('discounts').update({ is_active: !current }).eq('id', id)
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, is_active: !current } : d))
  }

  async function deleteDiscount(id: string) {
    if (!window.confirm('Delete this discount?')) return
    const supabase = createClient()
    await supabase.from('discounts').delete().eq('id', id)
    setDiscounts(prev => prev.filter(d => d.id !== id))
    toast.success('Discount removed')
  }

  function discountLabel(d: Discount) {
    return d.label ?? (OCCASIONS.find(o => o.value === d.occasion)?.label ?? d.occasion ?? '—')
  }

  function discountDisplay(d: Discount) {
    return d.discount_type === 'percentage'
      ? `${d.discount_value}% off`
      : `${formatPrice(d.discount_value)} off`
  }

  function isActive(d: Discount) {
    if (!d.is_active) return false
    const now = Date.now()
    if (d.starts_at && new Date(d.starts_at).getTime() > now) return false
    if (d.ends_at   && new Date(d.ends_at).getTime()   < now) return false
    return true
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-neutral-300" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-satoshi text-xl font-bold text-neutral-900">Discounts</h1>
          <p className="text-neutral-500 text-sm mt-1">Create sale offers for special occasions. Admin announcements will prompt you here.</p>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); if (showForm) resetForm() }}
          className="flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#e85a2d] transition-all flex-shrink-0"
        >
          <Plus size={14} />
          New discount
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
          <h3 className="font-satoshi font-bold text-neutral-900">New discount</h3>

          {/* Occasion */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700">Occasion</label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOccasion(o.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all
                    ${occasion === o.value
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700">Display label <span className="text-neutral-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={`e.g. "Black Friday Flash Sale"`}
              className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
            />
          </div>

          {/* Type + value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Discount type</label>
              <div className="flex rounded-xl overflow-hidden border border-neutral-200">
                {(['percentage', 'fixed'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDiscountType(type)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-all
                      ${discountType === type ? 'bg-brand-dark text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {type === 'percentage' ? '% Off' : '₦ Off'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">
                Value {discountType === 'percentage' ? '(%)' : '(₦)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold text-sm">
                  {discountType === 'percentage' ? '%' : '₦'}
                </span>
                <input
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? 90 : undefined}
                  step="1"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  required
                  className="w-full h-11 pl-8 pr-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
            </div>
          </div>

          {/* Applies to */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-neutral-700">Applies to</label>
            <div className="flex rounded-xl overflow-hidden border border-neutral-200">
              {([
                { value: 'all_listings', label: 'All my listings' },
                { value: 'product',      label: 'Specific product' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAppliesTo(opt.value)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all
                    ${appliesTo === opt.value ? 'bg-brand-dark text-white' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {appliesTo === 'product' && (
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="mt-2 h-11 px-4 border border-neutral-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
              >
                <option value="">Select a listing…</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>{l.title} — {formatPrice(l.price)}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Starts</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-neutral-700">Ends</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                className="h-11 px-4 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#e85a2d] disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
              Create discount
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="text-sm text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Discount list */}
      {discounts.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center">
          <Tag size={28} className="text-neutral-200 mx-auto mb-3" />
          <p className="font-semibold text-neutral-600">No discounts yet</p>
          <p className="text-sm text-neutral-400 mt-1">Create a discount to promote your listings during sales events.</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100">
          {discounts.map(d => {
            const active = isActive(d)
            return (
              <div key={d.id} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-orange/10' : 'bg-neutral-100'}`}>
                  <Tag size={18} className={active ? 'text-brand-orange' : 'text-neutral-300'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral-900 text-sm truncate">{discountLabel(d)}</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-400'}`}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {discountDisplay(d)} · {d.applies_to === 'all_listings' ? 'All listings' : 'Specific product'}
                    {d.ends_at && ` · Ends ${new Date(d.ends_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(d.id, d.is_active)}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${d.is_active ? 'bg-brand-green' : 'bg-neutral-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${d.is_active ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <button onClick={() => deleteDiscount(d.id)}
                    className="p-1.5 text-neutral-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
