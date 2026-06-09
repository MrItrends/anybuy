'use client'

import { AddressAutocomplete, Input, ProductCard } from '@/components/ui'
import type { AddressResult } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '@anybuy/utils'
import type { Product } from '@anybuy/types'
import { ArrowRight, Check, Loader2, MapPin, Minus, Plus, ShieldCheck, Tag, Trash2, Truck, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void }
    }
  }
}

interface SavedAddress {
  id: string
  label: string
  street: string
  city: string
  state: string
  is_default: boolean
}

const LABELS = ['Home', 'Office', 'Other']

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuthStore()
  const { items, total, clearCart, removeItem, updateQuantity } = useCartStore()
  const router = useRouter()

  // Address state
  const [savedAddresses, setSavedAddresses]     = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new')
  const [showNewForm, setShowNewForm]           = useState(false)
  const [newAddress, setNewAddress]             = useState({ label: 'Home', street: '', city: '', state: '' })
  const [saveAddress, setSaveAddress]           = useState(true)
  const [addressLoading, setAddressLoading]     = useState(true)

  const [loading, setLoading]       = useState(false)
  const [topPicks, setTopPicks]     = useState<Product[]>([])
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherDiscount, setVoucherDiscount] = useState(0)
  const [voucherLabel, setVoucherLabel]       = useState('')
  const [voucherLoading, setVoucherLoading]   = useState(false)

  const subtotal     = total()
  const platformFee  = Math.round(subtotal * 0.05)
  const grandTotal   = subtotal + platformFee - voucherDiscount
  const itemCount   = items.reduce((s, i) => s + i.quantity, 0)

  // Resolved address sent to the API
  const activeAddress = (() => {
    if (selectedAddressId === 'new') return newAddress
    return savedAddresses.find(a => a.id === selectedAddressId) ?? newAddress
  })()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  // Load Paystack
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  // Load saved addresses
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setSavedAddresses(data)
          const def = data.find(a => a.is_default) ?? data[0]
          setSelectedAddressId(def.id)
          setShowNewForm(false)
        } else {
          setSelectedAddressId('new')
          setShowNewForm(true)
        }
        setAddressLoading(false)
      })
  }, [user])

  // Load top picks
  useEffect(() => {
    if (items.length === 0) return
    const categories = [...new Set(items.map(i => i.product.category))]
    const cartIds    = items.map(i => i.product.id)
    const supabase   = createClient()
    supabase
      .from('products')
      .select('id, seller_id, title, price, original_price, category, subcategory, condition, thumbnail_url, is_negotiable, is_available, view_count, created_at, updated_at, virtual_tryon_enabled, seller:profiles!seller_id(id, full_name, rating, rating_count, is_verified)')
      .in('category', categories)
      .eq('is_available', true)
      .not('id', 'in', `(${cartIds.join(',')})`)
      .order('view_count', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data) setTopPicks(data.map((p: any) => ({ ...p, media: [], seller: Array.isArray(p.seller) ? p.seller[0] : p.seller })))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function persistNewAddress(): Promise<string | null> {
    if (!user || !saveAddress) return null
    const supabase = createClient()
    const isFirst  = savedAddresses.length === 0
    const { data, error } = await supabase
      .from('user_addresses')
      .insert({ user_id: user.id, ...newAddress, is_default: isFirst })
      .select()
      .single()
    if (!error && data) {
      setSavedAddresses(prev => isFirst ? [data] : [data, ...prev])
      setSelectedAddressId(data.id)
    }
    return error ? null : data.id
  }

  async function deleteAddress(id: string) {
    const supabase = createClient()
    await supabase.from('user_addresses').delete().eq('id', id)
    setSavedAddresses(prev => prev.filter(a => a.id !== id))
    if (selectedAddressId === id) {
      const remaining = savedAddresses.filter(a => a.id !== id)
      if (remaining.length > 0) {
        setSelectedAddressId(remaining[0].id)
      } else {
        setSelectedAddressId('new')
        setShowNewForm(true)
      }
    }
  }

  async function applyVoucher() {
    const code = voucherCode.trim().toUpperCase()
    if (!code) return
    setVoucherLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      toast.error('Invalid or expired voucher code')
      setVoucherLoading(false)
      return
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error('This voucher has expired')
      setVoucherLoading(false)
      return
    }
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
      toast.error('This voucher has reached its usage limit')
      setVoucherLoading(false)
      return
    }
    if (subtotal < (data.min_order_amount ?? 0)) {
      toast.error(`Minimum order of ${formatPrice(data.min_order_amount)} required`)
      setVoucherLoading(false)
      return
    }
    const discount = data.discount_type === 'percentage'
      ? Math.round(subtotal * data.discount_value / 100)
      : Math.min(data.discount_value, subtotal)
    setVoucherDiscount(discount)
    setVoucherLabel(data.label ?? code)
    toast.success(`Voucher applied — ${formatPrice(discount)} off!`)
    setVoucherLoading(false)
  }

  function removeVoucher() {
    setVoucherCode('')
    setVoucherDiscount(0)
    setVoucherLabel('')
  }

  function initializePayment() {
    const addr = activeAddress
    if (!addr.street || !addr.city || !addr.state) {
      toast.error('Please fill in your delivery address')
      return
    }

    setLoading(true)

    // Save new address before payment if requested
    if (selectedAddressId === 'new' && saveAddress) {
      persistNewAddress()
    }

    const reference = `ANB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
      email: user!.email,
      amount: grandTotal * 100,
      currency: 'NGN',
      ref: reference,
      metadata: {
        custom_fields: [
          { display_name: 'Items',  variable_name: 'items',    value: items.length },
          { display_name: 'Buyer',  variable_name: 'buyer_id', value: user!.id     },
        ],
      },
      callback: (response: { reference: string }) => {
        handlePaymentSuccess(response.reference)
      },
      onClose: () => {
        setLoading(false)
        toast('Payment cancelled')
      },
    })

    handler.openIframe()
  }

  async function handlePaymentSuccess(reference: string) {
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, address: activeAddress, paystackReference: reference, total: grandTotal }),
      })
      if (!res.ok) throw new Error()
      clearCart()
      toast.success('Order placed! Your payment is held in escrow.')
      router.push('/orders')
    } catch {
      toast.error('Payment received but order creation failed. Contact support.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null
  if (items.length === 0) return null

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 lg:pb-10">

        {/* ── Header ── */}
        <div className="mb-2">
          <h1 className="font-satoshi text-3xl font-black text-neutral-900 uppercase tracking-tight">
            Your Bag
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            TOTAL ({itemCount} {itemCount === 1 ? 'Item' : 'Items'}){' '}
            <span className="font-bold text-neutral-900">{formatPrice(grandTotal)}</span>
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Items in your bag are not reserved — check out now to make them yours.
          </p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ── Left col ── */}
          <div>

            {/* Item list */}
            <div className="flex flex-col divide-y divide-neutral-100 border-t border-b border-neutral-100">
              {items.map(({ product, quantity, negotiated_price }) => {
                const unitPrice = negotiated_price ?? product.price
                return (
                  <div key={product.id} className="flex gap-4 py-5">
                    <div className="relative w-28 h-28 flex-shrink-0 bg-neutral-50 rounded-lg overflow-hidden">
                      <Image
                        src={product.thumbnail_url || '/placeholder-product.svg'}
                        alt={product.title}
                        fill className="object-cover" sizes="112px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-satoshi font-black text-sm text-neutral-900 uppercase tracking-tight leading-snug line-clamp-2">
                            {product.title}
                          </p>
                          {negotiated_price && (
                            <p className="text-[11px] text-brand-orange font-semibold mt-0.5">Negotiated price</p>
                          )}
                        </div>
                        <div className="flex items-start gap-2 flex-shrink-0">
                          <span className="font-satoshi font-black text-base text-neutral-900">
                            {formatPrice(unitPrice * quantity)}
                          </span>
                          <button onClick={() => { removeItem(product.id); toast('Item removed') }}
                            className="text-neutral-300 hover:text-neutral-600 transition-colors mt-0.5">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-auto pt-3 flex items-center gap-3">
                        <div className="flex items-center border border-neutral-200 rounded-lg">
                          <button onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 rounded-l-lg">
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-neutral-900">{quantity}</span>
                          <button onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-neutral-50 transition-colors text-neutral-600 rounded-r-lg">
                            <Plus size={12} />
                          </button>
                        </div>
                        {quantity > 1 && (
                          <span className="text-xs text-neutral-400">{formatPrice(unitPrice)} each</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Delivery address ── */}
            <div className="mt-10">
              <h2 className="font-satoshi font-black text-base text-neutral-900 uppercase tracking-tight mb-4">
                Delivery Address
              </h2>

              {addressLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Saved address cards */}
                  {savedAddresses.map(addr => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => { setSelectedAddressId(addr.id); setShowNewForm(false) }}
                      className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-brand-dark bg-brand-dark/5'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      {/* Radio circle */}
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedAddressId === addr.id ? 'border-brand-dark bg-brand-dark' : 'border-neutral-300'
                      }`}>
                        {selectedAddressId === addr.id && <Check size={9} className="text-white" strokeWidth={3} />}
                      </div>

                      {/* Address info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">{addr.label}</span>
                          {addr.is_default && (
                            <span className="text-[9px] font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded-full uppercase">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-700 leading-snug">{addr.street}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{addr.city}, {addr.state}</p>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteAddress(addr.id) }}
                        className="text-neutral-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </button>
                  ))}

                  {/* Add new address toggle */}
                  {!showNewForm ? (
                    <button
                      type="button"
                      onClick={() => { setShowNewForm(true); setSelectedAddressId('new') }}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-400 text-neutral-500 hover:text-neutral-700 transition-all text-sm font-semibold"
                    >
                      <MapPin size={16} className="flex-shrink-0" />
                      Use a different address
                    </button>
                  ) : (
                    <div className={`rounded-xl border-2 overflow-hidden transition-all ${
                      selectedAddressId === 'new' ? 'border-brand-dark' : 'border-neutral-200'
                    }`}>
                      {/* New address form header */}
                      <div
                        className="flex items-center gap-3 p-4 cursor-pointer"
                        onClick={() => setSelectedAddressId('new')}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedAddressId === 'new' ? 'border-brand-dark bg-brand-dark' : 'border-neutral-300'
                        }`}>
                          {selectedAddressId === 'new' && <Check size={9} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-bold text-neutral-900">New address</span>
                        {savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setShowNewForm(false); setSelectedAddressId(savedAddresses[0].id) }}
                            className="ml-auto text-neutral-300 hover:text-neutral-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {selectedAddressId === 'new' && (
                        <div className="px-4 pb-4 space-y-3 border-t border-neutral-100 pt-3">
                          {/* Label selector */}
                          <div className="flex gap-2">
                            {LABELS.map(l => (
                              <button
                                key={l}
                                type="button"
                                onClick={() => setNewAddress(a => ({ ...a, label: l }))}
                                className={`px-3 h-7 rounded-full text-xs font-semibold border transition-all ${
                                  newAddress.label === l
                                    ? 'bg-brand-dark border-brand-dark text-white'
                                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                                }`}
                              >
                                {l}
                              </button>
                            ))}
                          </div>

                          <AddressAutocomplete
                            label="Street Address"
                            placeholder="14 Admiralty Way, Lekki…"
                            value={newAddress.street}
                            onChange={street => setNewAddress(a => ({ ...a, street }))}
                            onAddressSelect={(result: AddressResult) =>
                              setNewAddress(a => ({ ...a, street: result.street, city: result.city, state: result.state }))
                            }
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="City" placeholder="Lagos"
                              value={newAddress.city}
                              onChange={e => setNewAddress(a => ({ ...a, city: e.target.value }))} />
                            <Input label="State" placeholder="Lagos State"
                              value={newAddress.state}
                              onChange={e => setNewAddress(a => ({ ...a, state: e.target.value }))} />
                          </div>

                          {/* Save toggle */}
                          <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
                            <div
                              onClick={() => setSaveAddress(s => !s)}
                              className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 relative ${saveAddress ? 'bg-brand-dark' : 'bg-neutral-200'}`}
                            >
                              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${saveAddress ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-xs text-neutral-600 font-medium">Save this address for future orders</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Top picks ── */}
            {topPicks.length > 0 && (
              <div className="mt-12">
                <h2 className="font-satoshi font-black text-base text-neutral-900 uppercase tracking-tight mb-5">
                  Top Picks For You
                </h2>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {topPicks.map(p => (
                    <div key={p.id} className="flex-shrink-0 w-[calc((100%-36px)/4)] min-w-[140px]">
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right col: CTA + summary ── */}
          <div className="lg:sticky lg:top-6 flex flex-col gap-4">

            {/* Checkout button */}
            <button
              onClick={initializePayment}
              disabled={loading}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-60 text-white font-satoshi font-black text-base uppercase tracking-wide flex items-center justify-between px-6 rounded-2xl transition-colors"
            >
              {loading ? 'Processing…' : 'Checkout'}
              <ArrowRight size={20} />
            </button>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-4 py-2">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <ShieldCheck size={13} className="text-brand-green" /> Escrow Protected
              </span>
              <span className="w-px h-3 bg-neutral-200" />
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <Truck size={13} className="text-brand-orange" /> Tracked Delivery
              </span>
            </div>

            {/* Voucher */}
            <div className="border-t border-neutral-100 pt-4">
              {voucherDiscount > 0 ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-brand-green" />
                    <div>
                      <p className="text-xs font-bold text-green-700">{voucherLabel}</p>
                      <p className="text-[10px] text-green-600">-{formatPrice(voucherDiscount)} saved</p>
                    </div>
                  </div>
                  <button onClick={removeVoucher} className="text-green-400 hover:text-green-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={voucherCode}
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && applyVoucher()}
                    placeholder="Voucher code"
                    className="flex-1 h-9 px-3 rounded-xl border border-neutral-200 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-brand-orange transition-colors uppercase font-mono tracking-wide"
                  />
                  <button
                    onClick={applyVoucher}
                    disabled={voucherLoading || !voucherCode.trim()}
                    className="h-9 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-xs font-bold text-neutral-700 transition-colors flex items-center gap-1.5"
                  >
                    {voucherLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                    Apply
                  </button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div className="border-t border-neutral-100 pt-4">
              <h2 className="font-satoshi font-black text-base text-neutral-900 uppercase tracking-tight mb-4">
                Order Summary
              </h2>
              <div className="flex flex-col gap-2 mb-4">
                {items.map(({ product, quantity, negotiated_price }) => {
                  const unitPrice = negotiated_price ?? product.price
                  return (
                    <div key={product.id} className="flex justify-between gap-2 text-sm">
                      <span className="text-neutral-500 truncate">
                        {product.title} <span className="text-neutral-400">×{quantity}</span>
                      </span>
                      <span className="font-medium flex-shrink-0">{formatPrice(unitPrice * quantity)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-neutral-100 pt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Platform fee (5%)</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-brand-green font-semibold">
                    <span>Voucher discount</span>
                    <span>-{formatPrice(voucherDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base pt-3 border-t border-neutral-100">
                  <span className="font-satoshi uppercase tracking-tight">Total</span>
                  <div className="text-right">
                    <span className="font-satoshi text-neutral-900">{formatPrice(grandTotal)}</span>
                    <p className="text-[10px] text-neutral-400 font-normal">Inclusive of platform fee</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow explanation */}
            <div className="bg-brand-dark rounded-xl p-4 text-white mt-2">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={15} className="text-brand-orange" />
                <h3 className="font-satoshi font-bold text-sm">How your payment is protected</h3>
              </div>
              <ol className="space-y-1.5 text-xs text-white/70">
                {[
                  'You pay — funds held securely by AnyBuy',
                  'Seller ships your item',
                  'You receive and inspect the item',
                  'You confirm — funds released to seller',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-[10px] text-neutral-400 text-center">
              Secured by Paystack · Protected by AnyBuy Escrow
            </p>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 flex items-center gap-3 z-40 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="font-satoshi text-lg font-black text-neutral-900 leading-none">{formatPrice(grandTotal)}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{itemCount} {itemCount === 1 ? 'item' : 'items'} · incl. platform fee</p>
        </div>
        <button
          onClick={initializePayment}
          disabled={loading}
          className="h-11 px-6 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-60 text-white font-satoshi font-black text-sm uppercase tracking-wide flex items-center gap-2 flex-shrink-0 rounded-xl"
        >
          {loading ? 'Processing…' : 'Checkout'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
