import type { User } from '@anybuy/types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: User | null
  loading: boolean
  loginModalOpen: boolean
  loginModalReason: string | null
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  requireAuth: (reason?: string) => boolean
  openLoginModal: (reason?: string) => void
  closeLoginModal: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      loginModalOpen: false,
      loginModalReason: null,

      setUser: (user) => set({ user, loading: false }),
      setLoading: (loading) => set({ loading }),

      requireAuth: (reason) => {
        if (get().user) return true
        get().openLoginModal(reason)
        return false
      },

      openLoginModal: (reason) =>
        set({ loginModalOpen: true, loginModalReason: reason ?? null }),

      closeLoginModal: () =>
        set({ loginModalOpen: false, loginModalReason: null }),
    }),
    {
      name: 'anybuy-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
