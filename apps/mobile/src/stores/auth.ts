import type { User } from '@anybuy/types'
import { create } from 'zustand'

interface AuthStore {
  user: User | null
  loginSheetOpen: boolean
  loginReason: string | null
  setUser: (user: User | null) => void
  requireAuth: (reason?: string) => boolean
  openLoginSheet: (reason?: string) => void
  closeLoginSheet: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loginSheetOpen: false,
  loginReason: null,

  setUser: (user) => set({ user }),

  requireAuth: (reason) => {
    if (get().user) return true
    get().openLoginSheet(reason)
    return false
  },

  openLoginSheet: (reason) => set({ loginSheetOpen: true, loginReason: reason ?? null }),
  closeLoginSheet: () => set({ loginSheetOpen: false, loginReason: null }),
}))
