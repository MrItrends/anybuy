'use client'

import { Button } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { formatPrice } from '@anybuy/utils'
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCartStore()
  const { requireAuth } = useAuthStore()
  const router = useRouter()

  const count     = itemCount()
  const subtotal  = total()
  const platformFee = Math.round(subtotal * 0.05)
  const grandTotal  = subtotal + platformFee

  function handleCheckout() {
    if (!requireAuth('purchase')) return
    router.push('/checkout')
  }

  if (count === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-neutral-100 flex items-center justify-center">
          <ShoppingBag size={32} className="text-neutral-400" />
        </div>
        <div>
          <h2 className="font-satoshi text-2xl font-bold text-neutral-900">Your cart is empty</h2>
          <p className="text-neutral-600 mt-2">Browse listings and add items you love.</p>
        </div>
        <Link href="/"><Button size="lg">Explore Listings</Button></Link>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 lg:pb-10">

        <h1 className="font-satoshi text-2xl font-bold text-neutral-900 mb-8">
          Cart <span className="text-neutral-500 font-normal text-lg">({count} {count === 1 ? 'item' : 'items'})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── Items ── */}
          <div className="lg:col-span-2 flex flex-col divide-y divide-neutral-100 border-t border-b border-neutral-100">
            {items.map(({ product, quantity, negotiated_price }) => {
              const unitPrice = negotiated_price ?? product.price
              return (
                <div key={product.id} className="flex gap-4 py-5">
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-50">
                    <Image
                      src={product.thumbnail_url || '/placeholder-product.svg'}
                      alt={product.title} fill className="object-cover" sizes="96px"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/products/${product.id}`}
                          className="font-semibold text-neutral-900 text-sm line-clamp-2 hover:text-brand-orange transition-colors">
                          {product.title}
                        </Link>
                        {negotiated_price && (
                          <p className="text-[11px] text-brand-orange font-semibold mt-0.5">Negotiated price</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <span className="font-satoshi font-bold text-neutral-900">
                          {formatPrice(unitPrice * quantity)}
                        </span>
                        <button onClick={() => removeItem(product.id)}
                          className="text-neutral-300 hover:text-red-500 transition-colors mt-0.5">
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

          {/* ── Summary ── */}
          <div className="lg:col-span-1 lg:sticky lg:top-6 flex flex-col gap-4">

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              className="w-full h-14 bg-brand-orange hover:bg-brand-orange/90 text-white font-satoshi font-black text-base uppercase tracking-wide flex items-center justify-between px-6 rounded-2xl transition-colors"
            >
              Checkout
              <ArrowRight size={20} />
            </button>

            {/* Trust */}
            <div className="flex items-center justify-center gap-3 py-1">
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
                <ShieldCheck size={13} className="text-brand-green" /> Escrow Protected
              </span>
            </div>

            {/* Order summary */}
            <div className="border-t border-neutral-100 pt-4">
              <h2 className="font-satoshi font-bold text-neutral-900 text-base uppercase tracking-tight mb-4">
                Order Summary
              </h2>
              <div className="flex flex-col gap-2 text-sm mb-3">
                {items.map(({ product, quantity, negotiated_price }) => {
                  const unitPrice = negotiated_price ?? product.price
                  return (
                    <div key={product.id} className="flex justify-between gap-2">
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
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Platform fee (5%)</span>
                  <span>{formatPrice(platformFee)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery</span>
                  <span className="text-brand-green font-medium">At checkout</span>
                </div>
                <div className="flex justify-between font-black text-base pt-3 border-t border-neutral-100">
                  <span className="font-satoshi uppercase tracking-tight">Total</span>
                  <span className="font-satoshi">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-100 px-4 py-3 flex items-center gap-3 z-40 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="font-satoshi text-lg font-black text-neutral-900 leading-none">{formatPrice(grandTotal)}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{count} {count === 1 ? 'item' : 'items'} · incl. platform fee</p>
        </div>
        <button
          onClick={handleCheckout}
          className="h-11 px-6 bg-brand-orange hover:bg-brand-orange/90 text-white font-satoshi font-black text-sm uppercase tracking-wide flex items-center gap-2 flex-shrink-0 rounded-xl"
        >
          Checkout <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
