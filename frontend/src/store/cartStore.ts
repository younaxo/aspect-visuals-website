import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ShopProduct, ShopSubscription } from '../types'

export type CartKind = 'subscription' | 'product'

export interface CartItem {
  id: string
  kind: CartKind
  name: string
  price: number
  duration?: number
  type: string
  giftable: boolean
}

interface CartState {
  items: CartItem[]
  promoCode: string
  promoDiscount: number
  addItem: (item: CartItem) => void
  removeItem: (id: string, kind: CartKind) => void
  clearCart: () => void
  applyPromo: (code: string, discount: number) => void
  clearPromo: () => void
  subtotal: () => number
  total: () => number
}

export function cartItemFromSubscription(item: ShopSubscription): CartItem {
  return {
    id: item.id,
    kind: 'subscription',
    name: item.name,
    price: item.price,
    duration: item.duration,
    type: item.type,
    giftable: true,
  }
}

export function cartItemFromProduct(item: ShopProduct): CartItem {
  return {
    id: item.id,
    kind: 'product',
    name: item.name,
    price: item.price,
    type: item.type,
    giftable: item.giftable,
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: '',
      promoDiscount: 0,
      addItem: (item) =>
        set((state) => {
          if (state.items.some((entry) => entry.id === item.id && entry.kind === item.kind)) {
            return state
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (id, kind) =>
        set((state) => ({
          items: state.items.filter((item) => !(item.id === id && item.kind === kind)),
        })),
      clearCart: () => set({ items: [], promoCode: '', promoDiscount: 0 }),
      applyPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),
      clearPromo: () => set({ promoCode: '', promoDiscount: 0 }),
      subtotal: () => get().items.reduce((sum, item) => sum + item.price, 0),
      total: () => Math.max(0, get().subtotal() - get().promoDiscount),
    }),
    {
      name: 'aspect-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
