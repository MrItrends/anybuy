import type { CartItem, Product } from '@anybuy/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, negotiatedPrice?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  itemCount: () => number
  total: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, negotiatedPrice) => {
        const existing = get().items.find(i => i.product.id === product.id)
        if (existing) {
          // Update quantity; also refresh negotiated price if buyer re-adds with a different offer
          set({
            items: get().items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + 1, negotiated_price: negotiatedPrice ?? i.negotiated_price }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, { product, quantity: 1, negotiated_price: negotiatedPrice }] })
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.product.id !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      total: () =>
        get().items.reduce((sum, i) => sum + (i.negotiated_price ?? i.product.price) * i.quantity, 0),
    }),
    { name: 'anybuy-cart' }
  )
)
